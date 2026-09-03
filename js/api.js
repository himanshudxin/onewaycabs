/**
 * OneWayTaxiBihar (onewaytaxibihar.com) - Production REST API Client
 * Genuine backend communication with server-side validation, secure sessions,
 * and zero mock demo data.
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
          ...(options.headers || {})
        }
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.warn(`[ApiClient] ${endpoint} returned error:`, errorMsg);
        return { success: false, status: response.status, message: errorMsg };
      }

      return data;
    } catch (err) {
      console.error(`[ApiClient] Network request failed for ${endpoint}:`, err);
      return { success: false, message: "Network connection error. Please try again." };
    }
  }

  // Health check
  static async checkHealth() {
    return await this.request("/api/health");
  }

  // Direct Passenger Login (Name + Phone, Zero OTP)
  static async directLogin(name, phone, email = "") {
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
    const cleanName = (name || "").trim();

    const res = await this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ name: cleanName, phone: cleanPhone, email })
    });

    if (res && res.success && res.token) {
      localStorage.setItem("otb_auth_token", res.token);
      localStorage.setItem("otb_current_user", JSON.stringify(res.user));
      return res;
    }

    return res || { success: false, message: "Login failed" };
  }

  // Get Current User Profile (Server-Verified)
  static async getUserProfile() {
    const token = localStorage.getItem("otb_auth_token");
    if (!token) return null;

    const res = await this.request("/api/user/profile");
    if (res && res.success && res.user) {
      localStorage.setItem("otb_current_user", JSON.stringify(res.user));
      return res.user;
    }

    // If token invalid/expired, clear local state
    if (res && res.status === 401) {
      this.logout();
    }
    return null;
  }

  // Logout Current User (Server session invalidation)
  static async logout() {
    try {
      await this.request("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    localStorage.removeItem("otb_auth_token");
    localStorage.removeItem("otb_current_user");
    localStorage.removeItem("owc_auth_token");
    return { success: true };
  }

  // Server-Side Fare & Distance Calculation Engine
  static async calculateFare(origin, dest, cabTier = "sedan", tripType = "oneway") {
    const res = await this.request("/api/fares/calculate", {
      method: "POST",
      body: JSON.stringify({ origin, dest, cabTier, tripType })
    });
    if (res && res.success && res.fare) {
      return res.fare;
    }
    return null;
  }

  // Get Genuine Customer Bookings (Strict Customer Isolation)
  static async getRides() {
    const res = await this.request("/api/bookings");
    if (res && res.success && Array.isArray(res.bookings)) {
      return res.bookings;
    }
    if (res && res.success && Array.isArray(res.rides)) {
      return res.rides;
    }
    return [];
  }

  // Submit New Booking Request (Status: REQUESTED, Server-Recalculated Fare)
  static async createBooking(bookingPayload) {
    const res = await this.request("/api/bookings", {
      method: "POST",
      body: JSON.stringify(bookingPayload)
    });

    if (res && res.success) {
      return res;
    }
    return res || { success: false, message: "Booking creation failed" };
  }

  // Cancel Booking with zero fee
  static async cancelBooking(bookingId) {
    return await this.request("/api/bookings/cancel", {
      method: "POST",
      body: JSON.stringify({ bookingId })
    });
  }

  // Get Customer Wallet Ledger
  static async getWalletLedger() {
    return await this.request("/api/wallet/ledger");
  }

  // Admin Portal APIs
  static async adminLogin(username, password) {
    return await this.request("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  }

  static async adminGetBookings(token) {
    return await this.request("/api/admin/bookings", {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  static async adminConfirmBooking(bookingId, token) {
    return await this.request("/api/admin/confirm", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId })
    });
  }

  static async adminAssignDriver(bookingId, driverId, token) {
    return await this.request("/api/admin/assign-driver", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId, driverId })
    });
  }

  static async adminVerifyPayment(bookingId, txnRef, token) {
    return await this.request("/api/admin/verify-payment", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId, txnRef })
    });
  }

  static async adminCancelBooking(bookingId, reason, token) {
    return await this.request("/api/admin/cancel-booking", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId, reason })
    });
  }

  static async adminGetPayments(token) {
    return await this.request("/api/admin/payments", {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  static async adminGetWalletLedger(token) {
    return await this.request("/api/admin/wallet-ledger", {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  static async adminAdjustWallet(userId, amount, type, description, token) {
    return await this.request("/api/admin/wallet-credit", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ userId, amount, type, description })
    });
  }

  static async adminGetAuditLogs(token) {
    return await this.request("/api/admin/audit-logs", {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  static async adminAddDriver(driverData, token) {
    return await this.request("/api/admin/drivers/add", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(driverData)
    });
  }

  static async adminGetDrivers(token) {
    return await this.request("/api/admin/drivers", {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Driver Partner Portal APIs
  static async driverLogin(phone, pin) {
    return await this.request("/api/driver/login", {
      method: "POST",
      body: JSON.stringify({ phone, pin })
    });
  }

  static async driverGetTrips(token) {
    return await this.request("/api/driver/trips", {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  static async driverUpdateStatus(bookingId, newStatus, token) {
    return await this.request("/api/driver/status", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bookingId, newStatus })
    });
  }

}

if (typeof window !== "undefined") {
  window.ApiClient = ApiClient;
}
