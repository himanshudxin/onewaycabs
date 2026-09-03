/**
 * OneWayTaxiBihar (onewaytaxibihar.com) - REST API Client
 * Seamless backend API communication with resilient localStorage fallback.
 */

class ApiClient {
  static baseUrl = "";

  static async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = localStorage.getItem("otb_auth_token");

    const defaultHeaders = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn(`[ApiClient] Network request failed for ${endpoint}. Using offline fallback:`, err.message);
      return null;
    }
  }

  // Health check
  static async checkHealth() {
    return await this.request("/api/health");
  }

  // Direct Login (No OTP verification - Instant access & ₹100 Welcome Bonus)
  static async directLogin(name, phone) {
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
    const cleanName = (name || "").trim() || "Valued Passenger";

    const user = {
      id: "usr_otb_" + Date.now().toString().slice(-6),
      name: cleanName,
      phone: `+91 ${cleanPhone}`,
      email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${cleanPhone.slice(-4)}@onewaytaxibihar.com`,
      city: "Patna",
      avatar: cleanName.substring(0, 2).toUpperCase(),
      memberSince: new Date().getFullYear().toString(),
      totalTrips: 0,
      rating: 5.0,
      walletBalance: 100
    };

    localStorage.setItem("otb_auth_token", "otb_tok_" + Date.now());
    localStorage.setItem("otb_current_user", JSON.stringify(user));
    return { success: true, token: "otb_tok_" + Date.now(), user: user };
  }

  // Legacy compat aliases redirecting cleanly to direct login
  static async sendOTP(phone) {
    return { success: true, message: `Direct authentication enabled for ${phone}` };
  }

  static async verifyOTP(phone, otp, name = "Passenger") {
    return this.directLogin(name, phone);
  }

  // Get Current User Profile (Returns null if logged out)
  static async getUserProfile() {
    const token = localStorage.getItem("otb_auth_token");
    if (!token) return null;

    const saved = localStorage.getItem("otb_current_user");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }

    const res = await this.request("/api/user/profile");
    if (res && res.success && res.user) return res.user;

    return null;
  }

  // Logout Current User
  static logout() {
    localStorage.removeItem("otb_auth_token");
    localStorage.removeItem("otb_current_user");
    localStorage.removeItem("owc_auth_token");
  }

  // Get Rides (Past and Active - Only genuine user bookings, 0 mock data)
  static async getRides() {
    const res = await this.request("/api/rides");
    if (res && res.success && Array.isArray(res.rides)) {
      return res.rides;
    }

    // Genuine local user bookings only (empty array if no rides booked yet)
    return JSON.parse(localStorage.getItem("oneway_taxi_bihar_bookings") || "[]");
  }

  // Create / Save a New Booking
  static async createBooking(rideData) {
    const res = await this.request("/api/rides", {
      method: "POST",
      body: JSON.stringify(rideData)
    });

    const local = JSON.parse(localStorage.getItem("oneway_taxi_bihar_bookings") || "[]");
    local.unshift(rideData);
    localStorage.setItem("oneway_taxi_bihar_bookings", JSON.stringify(local));

    if (res && res.success) return res;
    return { success: true, booking: rideData };
  }

  // Cancel Booking with zero fee
  static async cancelBooking(bookingId) {
    const res = await this.request("/api/rides/cancel", {
      method: "POST",
      body: JSON.stringify({ bookingId })
    });

    const local = JSON.parse(localStorage.getItem("oneway_taxi_bihar_bookings") || "[]");
    const updated = local.map(r => r.bookingId === bookingId ? { ...r, bookingStatus: "Cancelled (Refunded)" } : r);
    return res || { success: true };
  }

  // Send Fare Inquiry Lead to Helpdesk
  static async sendLead(leadData) {
    const res = await this.request("/api/leads", {
      method: "POST",
      body: JSON.stringify(leadData)
    });

    const local = JSON.parse(localStorage.getItem("oneway_taxi_leads") || "[]");
    local.unshift(leadData);
    localStorage.setItem("oneway_taxi_leads", JSON.stringify(local));

    if (res && res.success) return res;
    return { success: true, lead: leadData };
  }

  // Get All Leads (Helpdesk Portal)
  static async getLeads() {
    const res = await this.request("/api/leads");
    if (res && res.success && Array.isArray(res.leads)) {
      return res.leads;
    }
    return JSON.parse(localStorage.getItem("oneway_taxi_leads") || "[]");
  }

  // Get Categorized Location Recommendations for Pickup / Drop
  static async getLocationRecommendations(cityId = "patna", type = "pickup") {
    const res = await this.request(`/api/locations/recommendations?city=${encodeURIComponent(cityId)}&type=${encodeURIComponent(type)}`);
    if (res && res.success && Array.isArray(res.locations)) {
      return res;
    }

    // Resilient offline fallback using OTB_LOCATIONS
    const all = window.OTB_LOCATIONS || [];
    const lowerCity = (cityId || "patna").toLowerCase();
    let matched = all.filter(l => (l.cityId && l.cityId.toLowerCase() === lowerCity) || (l.cityName && l.cityName.toLowerCase().includes(lowerCity)));
    if (matched.length === 0) {
      matched = all.filter(l => l.popular).slice(0, 8);
    }

    const quickChips = matched.slice(0, 6).map(l => {
      let shortName = l.name;
      const m = shortName.match(/^(.*?)\s*\(/);
      if (m) shortName = m[1];
      return {
        id: l.id,
        label: shortName,
        fullAddress: l.address,
        category: l.category
      };
    });

    const categories = {};
    matched.forEach(l => {
      const cat = l.category || "Major Landmarks";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(l);
    });

    return {
      success: true,
      city: cityId,
      type: type,
      total: matched.length,
      quickChips: quickChips,
      categories: categories,
      locations: matched
    };
  }

  // Search Locations Across POIs & Landmarks
  static async searchLocations(query = "", cityId = "") {
    const q = encodeURIComponent(query || "");
    const c = encodeURIComponent(cityId || "");
    const res = await this.request(`/api/locations/search?q=${q}&city=${c}`);
    if (res && res.success && Array.isArray(res.results)) {
      return res.results;
    }

    // Offline fallback
    const all = window.OTB_LOCATIONS || [];
    const lowerQ = (query || "").toLowerCase();
    const lowerCity = (cityId || "").toLowerCase();

    return all.filter(l => {
      const matchesCity = !lowerCity || (l.cityId && l.cityId.toLowerCase() === lowerCity) || (l.cityName && l.cityName.toLowerCase().includes(lowerCity));
      if (!matchesCity) return false;
      if (!lowerQ) return true;

      const tagMatch = l.tags && l.tags.some(t => t.toLowerCase().includes(lowerQ));
      return (l.name && l.name.toLowerCase().includes(lowerQ)) ||
             (l.address && l.address.toLowerCase().includes(lowerQ)) ||
             (l.category && l.category.toLowerCase().includes(lowerQ)) ||
             (l.hindiName && l.hindiName.includes(query)) ||
             tagMatch;
    }).slice(0, 15);
  }

  // Get Popular Hubs
  static async getPopularLocations() {
    const res = await this.request("/api/locations/popular");
    if (res && res.success && Array.isArray(res.locations)) {
      return res.locations;
    }
    const all = window.OTB_LOCATIONS || [];
    return all.filter(l => l.popular);
  }
}

if (typeof window !== "undefined") {
  window.ApiClient = ApiClient;
}
