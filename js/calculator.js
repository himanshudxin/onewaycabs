/**
 * Fare Calculation Engine for OneWayTaxiBihar (onewaytaxibihar.com)
 * Computes exact distances, base fares, per-km charges, round-trip discounts, tolls, and GST.
 */

class FareCalculator {
  // Haversine formula to compute direct distance between any two lat/lng coordinates
  static calculateCoordinatesDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    // Road distance factor in Bihar highway network is ~1.28x of straight line
    return Math.round(R * c * 1.28);
  }

  // Calculate distance between any two districts or custom points
  static getRouteDistance(originDistrictId, destDistrictId, customOriginCoords = null, customDestCoords = null) {
    const origin = BIHAR_DISTRICTS.find((d) => d.id === originDistrictId);
    const dest = BIHAR_DISTRICTS.find((d) => d.id === destDistrictId);

    if (customOriginCoords && customDestCoords) {
      const distance = this.calculateCoordinatesDistance(customOriginCoords.lat, customOriginCoords.lng, customDestCoords.lat, customDestCoords.lng);
      const effectiveDist = Math.max(distance, 25);
      const hours = Math.floor(effectiveDist / 48);
      const mins = Math.round((effectiveDist % 48) * 1.25);
      const durationHours = `${hours > 0 ? hours + "h " : ""}${mins > 0 ? mins + "m" : "20m"}`;
      const tollEst = Math.round((effectiveDist / 70) * 55);
      return {
        distanceKm: effectiveDist,
        durationHours,
        tollEst,
        highway: "NH Highway Direct Route"
      };
    }

    if (!origin || !dest) return { distanceKm: 100, durationHours: "2h 30m", tollEst: 90, highway: "NH Highway Corridor" };

    if (origin.id === "patna") {
      return {
        distanceKm: dest.distanceFromPatnaKm || 40,
        durationHours: dest.durationHours || "1h 15m",
        tollEst: dest.tollEst !== undefined ? dest.tollEst : Math.round(((dest.distanceFromPatnaKm || 40) / 75) * 60),
        highway: dest.highway
      };
    } else if (dest.id === "patna") {
      return {
        distanceKm: origin.distanceFromPatnaKm || 40,
        durationHours: origin.durationHours || "1h 15m",
        tollEst: origin.tollEst !== undefined ? origin.tollEst : Math.round(((origin.distanceFromPatnaKm || 40) / 75) * 60),
        highway: origin.highway
      };
    } else if (origin.id === dest.id) {
      return {
        distanceKm: 35,
        durationHours: "1h 00m",
        tollEst: 0,
        highway: `Local Intra-District Tour (${origin.name})`
      };
    } else {
      // Inter-district route using Haversine calculation with Bihar road tortuosity factor
      const distance = this.calculateCoordinatesDistance(origin.lat, origin.lng, dest.lat, dest.lng);
      const hours = Math.floor(distance / 48);
      const mins = Math.round((distance % 48) * 1.25);
      const durationHours = `${hours > 0 ? hours + "h " : ""}${mins > 0 ? mins + "m" : "15m"}`;
      const tollEst = Math.round((distance / 70) * 55);
      return {
        distanceKm: Math.max(distance, 35),
        durationHours,
        tollEst,
        highway: `Connecting Highways via ${origin.name}-${dest.name} Corridor`
      };
    }
  }

  // Compute full fare for a specific cab category and trip type
  static calculateFare(cabCategory, distanceKm, tripType = "oneway", promoCode = null) {
    const effectiveKm = tripType === "roundtrip" ? distanceKm * 2 : distanceKm;

    // Base fare covers initial baseKm
    const extraKm = Math.max(0, effectiveKm - (cabCategory.baseKm || 15));
    let baseCabCharge = cabCategory.baseFare + extraKm * cabCategory.perKmRate;

    // Driver night / day allowance for round trip & long distances
    let driverAllowance = 0;
    if (tripType === "roundtrip" || effectiveKm > 200) {
      driverAllowance = 350; // Daily outstation captain allowance
    }

    // Round trip discount offer (Save 12% on return leg)
    let roundTripDiscount = 0;
    if (tripType === "roundtrip") {
      roundTripDiscount = Math.round(baseCabCharge * 0.12);
      baseCabCharge -= roundTripDiscount;
    }

    // Toll plaza estimate (Included in transparent total)
    const tollEst = Math.round((effectiveKm / 75) * 60);

    // Subtotal before taxes and promo
    const subtotal = Math.round(baseCabCharge + driverAllowance + tollEst);

    // Promo code computation
    let promoDiscount = 0;
    let promoMessage = "";
    if (promoCode && PROMO_CODES[promoCode.toUpperCase()]) {
      const promo = PROMO_CODES[promoCode.toUpperCase()];
      if (!promo.minFare || subtotal >= promo.minFare) {
        if (promo.discount) {
          promoDiscount = promo.discount;
        } else if (promo.discountPct) {
          promoDiscount = Math.min(Math.round((subtotal * promo.discountPct) / 100), promo.maxDiscount || 500);
        }
        promoMessage = `Applied ${promoCode.toUpperCase()}: -₹${promoDiscount}`;
      } else {
        promoMessage = `Requires min ride value of ₹${promo.minFare}`;
      }
    }

    const discountedSubtotal = Math.max(0, subtotal - promoDiscount);

    // 5% GST as per Indian Ride Hailing regulation
    const gstAmount = Math.round(discountedSubtotal * 0.05);
    const finalTotal = discountedSubtotal + gstAmount;

    return {
      cabId: cabCategory.id,
      cabName: cabCategory.name,
      tripType,
      distanceKm: effectiveKm,
      oneWayKm: distanceKm,
      baseCabCharge: Math.round(baseCabCharge),
      perKmRate: cabCategory.perKmRate,
      driverAllowance,
      tollEst,
      roundTripDiscount,
      subtotal,
      promoDiscount,
      promoMessage,
      gstAmount,
      finalTotal,
      savings: roundTripDiscount + promoDiscount
    };
  }

  // Get calculated fares for all cab categories for a given route
  static getAllCabFares(originDistrictId, destDistrictId, tripType = "oneway", promoCode = null, customOriginCoords = null, customDestCoords = null) {
    const route = this.getRouteDistance(originDistrictId, destDistrictId, customOriginCoords, customDestCoords);
    return CAB_CATEGORIES.map((cab) => {
      const fareDetails = this.calculateFare(cab, route.distanceKm, tripType, promoCode);
      return {
        ...cab,
        route,
        fareDetails
      };
    });
  }
}
