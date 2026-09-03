/**
 * Lightweight Spatial & Highway Intelligence Manager for OneWayTaxiBihar (onewaytaxibihar.com)
 * High-efficiency, silent zero-latency routing intelligence without heavy external map rendering.
 */

class BiharMapManager {
  constructor() {
    this.currentPickupCoords = { lat: 25.6022, lng: 85.1376 };
    this.currentDropCoords = { lat: 24.6959, lng: 84.9914 };
    this.currentPickupName = "Patna Junction (PNBE), Patna";
    this.currentDropName = "Mahabodhi Temple, Bodh Gaya";
  }

  // Safe initialization
  initMap() {
    // Silent mode - no heavy map tiles loaded
    return true;
  }

  setMapTheme(theme) {
    // Theme handled by CSS
  }

  plotRoute(originId, destId, pickupCoords, dropCoords, pickupName, dropName) {
    this.currentPickupCoords = pickupCoords || this.currentPickupCoords;
    this.currentDropCoords = dropCoords || this.currentDropCoords;
    this.currentPickupName = pickupName || this.currentPickupName;
    this.currentDropName = dropName || this.currentDropName;

    // Silent instantaneous execution
    return true;
  }

  findNearestDistrict(lat, lng) {
    if (typeof BIHAR_DISTRICTS === "undefined" || !BIHAR_DISTRICTS.length) return null;
    let closest = null;
    let minDistance = Infinity;

    BIHAR_DISTRICTS.forEach((d) => {
      if (typeof FareCalculator !== "undefined") {
        const dist = FareCalculator.calculateCoordinatesDistance(lat, lng, d.lat, d.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = d;
        }
      }
    });

    return closest;
  }

  locateDoorstepViaGPS() {
    if (window.bookingManager) {
      window.bookingManager.detectCurrentLocation();
    }
  }
}

// Global initialization
window.biharMap = new BiharMapManager();
