/**
 * OneWayTaxiBihar (onewaytaxibihar.com) - Main Application Controller
 * Handles Leaflet Interactive Map for Bihar, Modal Routing, OTP Authentication,
 * Friends Review Explorer, Corporate Travel, My Trips, Tax Invoice Generator, and Live GPS Tracking.
 */

let currentUser = null;
window.bookingManager = null;
window.onewayMap = null;
window.themeManager = null;

document.addEventListener("DOMContentLoaded", async () => {
  // 0. Initialize Theme Manager
  window.themeManager = new ThemeManager();

  // 1. Initialize Leaflet Map
  window.onewayMap = new OneWayMapManager("oneway-route-map");
  window.onewayMap.initMap();

  // 2. Initialize Booking Manager
  window.bookingManager = new BookingManager();
  window.bookingManager.init();

  // 3. Check Auth State
  await initAuthState();

  // 4. Setup Global UI Events
  setupGlobalModalEvents();
  setupMobileDrawer();
});

/* ==========================================================================
   1. LEAFLET INTERACTIVE MAP CONTROLLER FOR BIHAR
   ========================================================================== */
class OneWayMapManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.originMarker = null;
    this.destMarker = null;
    this.routePolyline = null;
    this.carMarker = null;
  }

  initMap() {
    const el = document.getElementById(this.containerId);
    if (!el || typeof L === "undefined") return;

    // Default center Patna - Gaya corridor
    this.map = L.map(this.containerId).setView([25.2, 85.1], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap contributors | OneWayTaxiBihar (onewaytaxibihar.com)'
    }).addTo(this.map);
  }

  updateRoute(originCity, destCity, distanceKm) {
    if (!this.map || typeof L === "undefined") return;

    const oLat = originCity.lat;
    const oLng = originCity.lng;
    const dLat = destCity.lat;
    const dLng = destCity.lng;

    if (this.originMarker) this.map.removeLayer(this.originMarker);
    if (this.destMarker) this.map.removeLayer(this.destMarker);
    if (this.routePolyline) this.map.removeLayer(this.routePolyline);

    const greenIcon = L.divIcon({
      className: "custom-map-icon",
      html: `<div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4"/></svg></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const redIcon = L.divIcon({
      className: "custom-map-icon",
      html: `<div style="background: #0095f6; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0, 149, 246, 0.4);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    this.originMarker = L.marker([oLat, oLng], { icon: greenIcon })
      .addTo(this.map)
      .bindPopup(`<b>Pickup: ${originCity.name} (${originCity.hindiName || ''})</b><br>${originCity.state}`);

    this.destMarker = L.marker([dLat, dLng], { icon: redIcon })
      .addTo(this.map)
      .bindPopup(`<b>Drop: ${destCity.name} (${destCity.hindiName || ''})</b><br>${destCity.state}`);

    const midLat = (oLat + dLat) / 2 + 0.05;
    const midLng = (oLng + dLng) / 2 + 0.05;
    const routePoints = [
      [oLat, oLng],
      [midLat, midLng],
      [dLat, dLng]
    ];

    this.routePolyline = L.polyline(routePoints, {
      color: "#05a357",
      weight: 5,
      opacity: 0.85,
      dashArray: "10, 8"
    }).addTo(this.map);

    const bounds = L.latLngBounds(routePoints);
    this.map.fitBounds(bounds, { padding: [40, 40] });
  }
}

/* ==========================================================================
   2. AUTHENTICATION, WALLET & REFERRAL REWARDS CONTROLLER
   ========================================================================== */
async function initAuthState() {
  currentUser = await ApiClient.getUserProfile();
  renderNavAuth();
}

function renderNavAuth() {
  const navSlot = document.getElementById("nav-auth-slot");
  const mobileSlot = document.getElementById("mobile-auth-slot");
  const bannerTitle = document.getElementById("w-banner-title");
  const bannerSub = document.getElementById("w-banner-sub");
  const bannerBtn = document.getElementById("w-banner-btn");

  if (currentUser) {
    const bal = currentUser.walletBalance !== undefined ? currentUser.walletBalance : 100;
    const initial = (currentUser.name || 'U').charAt(0).toUpperCase();
    const htmlDesktop = `
      <div class="user-profile-nav-chip" title="Account & Wallet: ₹${bal}">
        <div class="user-avatar-small" onclick="window.openMyTripsModal()">${initial}</div>
        <span onclick="window.openMyTripsModal()">${(currentUser.name || 'User').split(' ')[0]}</span>
        <span class="wallet-badge-pill" onclick="window.openMyTripsModal()">₹${bal}</span>
        <button type="button" class="nav-logout-btn" onclick="window.handleLogout()" title="Logout Account">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        </button>
      </div>
    `;
    const htmlMobile = `
      <div class="drawer-user-card">
        <div class="drawer-user-avatar" onclick="window.closeMobileDrawer(); window.openMyTripsModal();">${initial}</div>
        <div class="drawer-user-info" onclick="window.closeMobileDrawer(); window.openMyTripsModal();">
          <div class="drawer-user-name">${currentUser.name || 'Passenger'}</div>
          <div class="drawer-user-phone">${currentUser.phone || '+91 User'}</div>
        </div>
        <div class="drawer-user-actions">
          <div class="drawer-wallet-pill" onclick="window.closeMobileDrawer(); window.openMyTripsModal();">₹${bal}</div>
          <button type="button" class="drawer-logout-btn" onclick="window.handleLogout()" title="Logout Account">Logout</button>
        </div>
      </div>
    `;
    if (navSlot) navSlot.innerHTML = htmlDesktop;
    if (mobileSlot) mobileSlot.innerHTML = htmlMobile;
  } else {
    const htmlDesktop = `
      <button type="button" class="btn-nav-outline" onclick="window.openAuthModal()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px; vertical-align: middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Login
      </button>
    `;
    const htmlMobile = `
      <button type="button" class="drawer-login-btn" onclick="window.closeMobileDrawer(); window.openAuthModal();">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; vertical-align: middle;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Login & Claim ₹100 Bonus
      </button>
    `;
    if (navSlot) navSlot.innerHTML = htmlDesktop;
    if (mobileSlot) mobileSlot.innerHTML = htmlMobile;
  }
}

// Global Logout Handler
window.handleLogout = async () => {
  await ApiClient.logout();
  currentUser = null;
  renderNavAuth();
  window.closeAllModals();
  window.showToast("Logged out successfully.", "info");
};

// Open Auth Modal (Direct Login - Name + 10-Digit Mobile, Zero OTP)
window.openAuthModal = () => {
  window.closeAllModals(false);
  const modal = document.getElementById("modal-auth");
  const nameInput = document.getElementById("auth-name-input");
  const phoneInput = document.getElementById("auth-mobile-input");

  if (nameInput) nameInput.value = "";
  if (phoneInput) phoneInput.value = "";

  if (modal) {
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    history.pushState({ modal: "modal-auth" }, "", "#modal-auth");
    setTimeout(() => {
      if (nameInput) nameInput.focus();
    }, 150);
  }
};

window.handleDirectLogin = async () => {
  const nameInput = document.getElementById("auth-name-input");
  const phoneInput = document.getElementById("auth-mobile-input");
  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim().replace(/\D/g, "").slice(-10) : "";

  if (!name || name.length < 2 || name.length > 60) {
    window.showToast("Please enter your full name (2 to 60 characters)", "warning");
    if (nameInput) nameInput.focus();
    return;
  }

  if (!phone || phone.length !== 10 || !/^[6-9]\d{9}$/.test(phone)) {
    window.showToast("Please enter a valid 10-digit Indian mobile number starting with 6-9", "warning");
    if (phoneInput) phoneInput.focus();
    return;
  }

  const res = await ApiClient.directLogin(name, phone);
  if (res && res.success) {
    currentUser = res.user;
    renderNavAuth();
    window.closeAllModals();
    window.showToast(`Welcome, ${currentUser.name}! Logged in successfully. ₹100 Welcome Bonus added to your wallet.`, "success");
  } else {
    window.showToast(res?.message || "Login failed. Please check your credentials.", "warning");
  }
};

/* ==========================================================================
   REFER & EARN ₹150 CONTROLLER
   ========================================================================== */
window.openReferModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-refer");
  const body = document.getElementById("modal-refer-body");
  if (!modal || !body) return;

  const phoneSuffix = currentUser && currentUser.phone ? currentUser.phone.replace(/\D/g, "").slice(-4) : "6206";
  const refCode = currentUser?.referralCode || `OTB-CAB-${phoneSuffix}`;
  const shareMsg = `Book one-way outstation cabs across all 38 districts of Bihar with zero return fare on OneWayTaxiBihar!\n\nUse my Referral Code: *${refCode}* or book directly at: ${window.location.origin}\n\nGet reliable doorstep pickup & verified captains.`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareMsg)}`;

  body.innerHTML = `
    <div class="refer-modal-container">
      <div class="refer-hero-badge">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="var(--owc-primary)" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
      </div>
      <h3 class="refer-title">Refer Friends & Earn ₹150 Wallet Cash</h3>
      <p class="refer-desc">
        Invite friends & family to OneWayTaxiBihar. When they complete their first outstation ride, <strong>₹150 is credited directly into your wallet</strong>!
      </p>

      <div class="refer-code-box">
        <div>
          <div style="font-size: 11px; font-weight: 700; color: var(--owc-text-muted); text-transform: uppercase;">Your Unique Referral Code</div>
          <div class="refer-code-val" id="ref-code-display">${refCode}</div>
        </div>
        <button type="button" class="btn-copy-code" onclick="window.copyReferralCode('${refCode}')">Copy Code</button>
      </div>

      <div class="refer-stats-grid">
        <div class="refer-stat-card">
          <div class="refer-stat-num">${currentUser?.referralsCount || 0}</div>
          <div class="refer-stat-lbl">Friends Joined</div>
        </div>
        <div class="refer-stat-card">
          <div class="refer-stat-num">${currentUser?.completedRefTrips || 0}</div>
          <div class="refer-stat-lbl">Trips Done</div>
        </div>
        <div class="refer-stat-card">
          <div class="refer-stat-num">₹${currentUser?.referralEarnings || 0}</div>
          <div class="refer-stat-lbl">Total Earned</div>
        </div>
      </div>

      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="btn-wa-share">
        Share Referral on WhatsApp →
      </a>

      <div style="font-size: 12px; color: var(--owc-text-muted); margin-top: 14px; line-height: 1.4;">
        • ₹100 Welcome bonus credited on OTP login (one-time per user)<br>
        • ₹150 Referral reward credited automatically upon friend's trip completion
      </div>
    </div>
  `;

  modal.classList.add("open");
};

window.copyReferralCode = (code) => {
  navigator.clipboard.writeText(code).then(() => {
    window.showToast(`Referral code ${code} copied to clipboard!`, "success");
  }).catch(() => {
    window.showToast(`Referral code: ${code}`, "info");
  });
};

/* ==========================================================================
   EXECUTIVE COMPANY, TRUST & POLICY MODALS
   ========================================================================== */
window.openInfoDocModal = (title, contentHtml) => {
  window.closeAllModals();
  const modal = document.getElementById("modal-info-doc");
  const titleEl = document.getElementById("modal-info-title");
  const bodyEl = document.getElementById("modal-info-body");
  if (!modal || !bodyEl) return;

  if (titleEl) titleEl.textContent = title;
  bodyEl.innerHTML = contentHtml;
  modal.classList.add("open");
};

window.openWhyChooseModal = () => {
  const content = `
    <div class="info-doc-container">
      <div class="info-doc-hero">
        <span class="info-doc-pill">The OneWay Advantage</span>
        <h2>Why OneWayTaxiBihar is Bihar's #1 Choice</h2>
        <p>Traditional taxis force commuters to pay two-way round-trip fares even for a single-side journey. OneWayTaxiBihar eliminated return fares forever, saving passengers up to 45% on every outstation trip.</p>
      </div>

      <div class="info-compare-table-wrap">
        <table class="info-compare-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th style="color: var(--owc-primary);">OneWayTaxiBihar</th>
              <th>Local City Cabs</th>
              <th>Trains / Buses</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Return Fare</strong></td>
              <td class="highlight-yes">₹0 (Zero Return Fare)</td>
              <td class="highlight-no">Double Fare Charged</td>
              <td>Fixed Schedule Only</td>
            </tr>
            <tr>
              <td><strong>Doorstep Pickup</strong></td>
              <td class="highlight-yes">Any Pin Code in Bihar</td>
              <td class="highlight-no">Extra Pickup Charges</td>
              <td class="highlight-no">Station/Stand Only</td>
            </tr>
            <tr>
              <td><strong>Tolls & Fastag</strong></td>
              <td class="highlight-yes">100% Included in Quote</td>
              <td class="highlight-no">Surprise Toll Demands</td>
              <td>Included</td>
            </tr>
            <tr>
              <td><strong>AC Cooling</strong></td>
              <td class="highlight-yes">Guaranteed 100% Chilled AC</td>
              <td>Variable / Extra Charge</td>
              <td>Only in AC coaches</td>
            </tr>
            <tr>
              <td><strong>Emergency Support</strong></td>
              <td class="highlight-yes">24×7 Central Patna Desk</td>
              <td>None / Driver direct</td>
              <td>Counter queues</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="margin-top: 24px; text-align: center;">
        <button type="button" class="check-fare-primary-btn" onclick="window.closeAllModals(); window.scrollTo({top: 0, behavior: 'smooth'});">
          Book Your One-Way Cab Now →
        </button>
      </div>
    </div>
  `;
  window.openInfoDocModal("Why Choose OneWayTaxiBihar", content);
};

window.openAboutModal = () => {
  const content = `
    <div class="info-doc-container">
      <div class="info-doc-hero">
        <span class="info-doc-pill">Our Heritage & Mission</span>
        <h2>Built in बिहार for BHARAT</h2>
        <p>Founded in Patna, OneWayTaxiBihar is Bihar's dedicated intercity mobility network engineered to make highway travel across all 38 districts honest, reliable, and affordable.</p>
      </div>

      <div class="info-grid-cards">
        <div class="info-card">
          <div class="info-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-7h6v7"/></svg>
          </div>
          <h3>38 Districts Connected</h3>
          <p>From Kishanganj to Kaimur, and West Champaran to Banka, our network links every corner of Bihar seamlessly with Patna, Gaya, Darbhanga, and pan-India destinations.</p>
        </div>
        <div class="info-card">
          <div class="info-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3>Verified Highway Captains</h3>
          <p>Over 1,200+ police-verified drivers trained specifically for Bihar highways, Mahatma Gandhi Setu, Ganga Pathway, and Purvanchal corridors.</p>
        </div>
        <div class="info-card">
          <div class="info-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <h3>Transparent Kilometer Billing</h3>
          <p>Zero surge pricing during festival rushes like Chhath Puja, Diwali, and wedding seasons. What you see is what you pay.</p>
        </div>
        <div class="info-card">
          <div class="info-card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>
          </div>
          <h3>Patna Central Hub</h3>
          <p>Headquartered at Boring Road, Patna, operating 24 hours a day, 365 days a year with active GPS fleet telematics.</p>
        </div>
      </div>
    </div>
  `;
  window.openInfoDocModal("About OneWayTaxiBihar", content);
};

window.openContactModal = () => {
  window.openHelpModal();
};

window.openTermsModal = () => {
  const content = `
    <div class="info-doc-container">
      <div class="info-doc-hero">
        <span class="info-doc-pill">Official Agreement</span>
        <h2>Terms & Conditions of Carriage</h2>
        <p>Clear, transparent, and passenger-first terms governing all rides on onewaytaxibihar.com.</p>
      </div>

      <div class="info-policy-sections">
        <div class="policy-block">
          <h4>1. Transparent Fares & Inclusions</h4>
          <p>All one-way fares quoted include vehicle rental, driver allowance, highway toll taxes (Fastag), and applicable GST. No hidden doorstep or night surge fees will be charged for booked routes.</p>
        </div>
        <div class="policy-block">
          <h4>2. Zero Cancellation Charge Policy</h4>
          <p>Passengers can cancel any booking free of charge up to 60 minutes prior to pickup. In the rare event of vehicle breakdown, a replacement cab of equivalent or higher class will be dispatched immediately.</p>
        </div>
        <div class="policy-block">
          <h4>3. Punctuality & Waiting Time</h4>
          <p>Complimentary 25 minutes of doorstep waiting time is provided at pickup. Beyond 25 minutes, a standard waiting charge of ₹120/hour may apply.</p>
        </div>
        <div class="policy-block">
          <h4>4. Luggage & Seating Capacity</h4>
          <p>Sedan: Up to 4 passengers + 2 large luggage bags. SUV / Innova: Up to 6-7 passengers + 4 luggage bags. Carriage of prohibited substances under Bihar state laws is strictly forbidden.</p>
        </div>
      </div>
    </div>
  `;
  window.openInfoDocModal("Terms & Conditions", content);
};

window.openPrivacyModal = () => {
  const content = `
    <div class="info-doc-container">
      <div class="info-doc-hero">
        <span class="info-doc-pill">Data Protection</span>
        <h2>Privacy & Passenger Safety Policy</h2>
        <p>Your privacy and safety are paramount. We follow strict end-to-end data confidentiality standards.</p>
      </div>

      <div class="info-policy-sections">
        <div class="policy-block">
          <h4>1. Passenger Mobile Number Masking</h4>
          <p>When you contact your assigned Captain, calls are routed through our secure masked tele-relay system so your private contact number is never exposed to drivers or third parties.</p>
        </div>
        <div class="policy-block">
          <h4>2. Secure Direct Session Authentication</h4>
          <p>All login credentials, wallet balances, and bookings are encrypted and transmitted over secure 256-bit TLS/SSL channels with server-side session protection.</p>
        </div>
        <div class="policy-block">
          <h4>3. Live Highway GPS Tracking</h4>
          <p>GPS tracking data is collected exclusively during the active journey for passenger safety, route navigation, and ERSS-112 SOS emergency monitoring.</p>
        </div>
        <div class="policy-block">
          <h4>4. Zero Third-Party Data Selling</h4>
          <p>OneWayTaxiBihar never sells, rents, or monetizes passenger contact data, ride history, or financial records.</p>
        </div>
      </div>
    </div>
  `;
  window.openInfoDocModal("Privacy Policy", content);
};

window.openCancellationModal = () => {
  const content = `
    <div class="info-doc-container">
      <div class="info-doc-hero">
        <span class="info-doc-pill">100% Refund Policy</span>
        <h2>Cancellation & Refund Policy</h2>
        <p>OneWayTaxiBihar believes in fair, honest, and passenger-friendly policies. Zero hidden penalties.</p>
      </div>

      <div class="info-policy-sections">
        <div class="policy-block">
          <h4>1. Free Cancellation Anytime Before Dispatch</h4>
          <p>You can cancel your booking anytime before driver dispatch with ₹0 cancellation fee. Any token advance or wallet balance used is 100% credited back immediately.</p>
        </div>
        <div class="policy-block">
          <h4>2. Instant Wallet & UPI Refund</h4>
          <p>For bookings paid via UPI or QR code, refunds are processed within 24 hours back to the source bank account, or instantly credited to your OneWayTaxiBihar wallet upon request.</p>
        </div>
        <div class="policy-block">
          <h4>3. No Surge Penalty</h4>
          <p>Even during festivals or highway delays, we do not deduct cancellation penalties if your travel plans change.</p>
        </div>
        <div class="policy-block">
          <h4>4. Guaranteed Cab or 100% Refund</h4>
          <p>In the rare circumstance that an assigned vehicle faces sudden mechanical breakdown, our Patna dispatch center guarantees a free replacement cab or a 100% refund with an additional ₹200 travel voucher.</p>
        </div>
      </div>
    </div>
  `;
  window.openInfoDocModal("Cancellation & Refund Policy", content);
};

/* ==========================================================================
   3. MY TRIPS & INVOICE DASHBOARD
   ========================================================================== */
window.openMyTripsModal = async () => {
  window.closeAllModals(false);
  const modal = document.getElementById("modal-my-trips");
  const body = document.getElementById("modal-my-trips-body");
  if (!modal || !body) return;

  const rides = await ApiClient.getRides();

  body.innerHTML = `
    <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--owc-border); padding-bottom: 14px;">
      <div>
        <h3 style="font-size: 18px; font-weight: 800; color: var(--owc-text);">Your Outstation Trips &amp; Account</h3>
        <p style="font-size: 13px; color: var(--owc-text-muted);">
          ${currentUser ? `<strong>${currentUser.name || 'Passenger'}</strong> (${currentUser.phone || ''}) • Wallet: <strong>₹${currentUser.walletBalance || 0}</strong>` : 'Manage your upcoming Bihar cab bookings & invoices'}
        </p>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button type="button" class="btn-nav-book" onclick="window.closeAllModals(); document.getElementById('booking-hero').scrollIntoView({behavior: 'smooth'})">
          + Book Cab
        </button>
        ${currentUser ? `
          <button type="button" class="btn-logout-danger" onclick="window.handleLogout()">
            Logout
          </button>
        ` : ''}
      </div>
    </div>

    ${rides.length === 0 ? `
      <div style="text-align: center; padding: 40px 20px; background: var(--owc-slate-50); border-radius: var(--radius-lg);">
        <div style="font-size: 24px; color: var(--owc-text-muted); margin-bottom: 10px;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        </div>
        <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 6px;">No trips yet.</h4>
        <p style="font-size: 13px; color: var(--owc-text-muted); margin-bottom: 16px;">Book your first one-way taxi across Bihar with zero return fare!</p>
        <button type="button" class="btn-select-cab" style="width: auto; padding: 10px 24px;" onclick="window.closeAllModals(); document.getElementById('booking-hero').scrollIntoView({behavior: 'smooth'})">Book Cab Now</button>
      </div>
    ` : `
      <div style="display: flex; flex-direction: column; gap: 14px; max-height: 480px; overflow-y: auto;">
        ${rides.map(r => `
          <div style="background: var(--owc-card-bg); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 18px; box-shadow: var(--shadow-sm);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <span style="background: var(--owc-primary-subtle); color: var(--owc-primary); font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: var(--radius-full);">
                  ${r.bookingId}
                </span>
                <h4 style="font-size: 16px; font-weight: 800; color: var(--owc-text); margin-top: 4px;">
                  ${r.originCity} → ${r.destCity}
                </h4>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 18px; font-weight: 900; color: var(--owc-primary);">₹${r.totalFare.toLocaleString('en-IN')}</span>
                <div style="font-size: 11px; color: ${r.bookingStatus === 'REQUESTED' ? '#f59e0b' : 'var(--owc-success)'}; font-weight: 800;">
                  ${r.bookingStatus === 'REQUESTED' ? 'REQUESTED / PENDING CONFIRMATION' : r.bookingStatus}
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 12.5px; color: var(--owc-text-muted); margin-bottom: 14px;">
              <span>Time: ${r.pickupDate} at ${r.pickupTime}</span>
              <span>Vehicle: ${r.fleetClass} (${r.fleetModel})</span>
              <span>Driver: ${r.driverDetails ? `${r.driverDetails.name} (${r.driverDetails.phone}) • ${r.driverDetails.vehicleNumber}` : 'Driver details will be shared after confirmation.'}</span>
            </div>

            <div style="display: flex; gap: 10px; border-top: 1px dashed var(--owc-border); padding-top: 12px;">
              <button type="button" class="btn-select-cab" style="padding: 8px 16px; font-size: 12.5px; width: auto;" onclick="window.startLiveTrackingSimulation('${r.bookingId}')">
                Track Live GPS
              </button>
              <button type="button" class="btn-nav-outline" style="padding: 8px 16px; font-size: 12.5px;" onclick="window.printTaxInvoice('${r.bookingId}')">
                Tax Invoice
              </button>
              <button type="button" style="background: transparent; border: 1px solid var(--owc-danger); color: var(--owc-danger); padding: 8px 16px; border-radius: var(--radius-md); font-size: 12.5px; font-weight: 700; cursor: pointer;" onclick="window.cancelRideWithRefund('${r.bookingId}')">
                Cancel (₹0 Fee)
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `}
  `;

  modal.classList.add("open");
  document.body.classList.add("modal-open");
  history.pushState({ modal: "modal-my-trips" }, "", "#modal-my-trips");
};

window.cancelRideWithRefund = async (bookingId) => {
  if (confirm(`Are you sure you want to cancel booking ${bookingId}?\nOneWayTaxiBihar has ZERO cancellation charges. Any payment will be 100% refunded to your wallet.`)) {
    await ApiClient.cancelBooking(bookingId);
    window.showToast(`Booking ${bookingId} cancelled with ₹0 fee. 100% refunded!`, "success");
    window.openMyTripsModal();
  }
};

/* ==========================================================================
   4. MODALS FOR SITE NAVIGATION
   ========================================================================== */
window.openServicesModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-services");
  const body = document.getElementById("modal-services-body");
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px;">
      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 20px;">
        <div style="color: var(--owc-primary); margin-bottom: 10px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        </div>
        <h3 style="font-size: 17px; font-weight: 800; color: var(--owc-text); margin-bottom: 6px;">One-Way Outstation Taxi</h3>
        <p style="font-size: 13px; color: var(--owc-text-muted); line-height: 1.5; margin-bottom: 14px;">
          Travel point-to-point between Patna and all 38 districts of Bihar without paying return fares. Guaranteed AC and police-verified captains.
        </p>
        <button type="button" class="btn-select-cab" style="width: auto; padding: 8px 16px; font-size: 13px;" onclick="window.closeAllModals(); document.getElementById('booking-hero').scrollIntoView({behavior: 'smooth'})">Book One-Way</button>
      </div>

      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 20px;">
        <div style="color: var(--owc-primary); margin-bottom: 10px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/></svg>
        </div>
        <h3 style="font-size: 17px; font-weight: 800; color: var(--owc-text); margin-bottom: 6px;">Round Trip Outstation (12% Off)</h3>
        <p style="font-size: 13px; color: var(--owc-text-muted); line-height: 1.5; margin-bottom: 14px;">
          Multi-day or same-day return trips across Bihar, Deoghar, Varanasi, or Ranchi with 12% discount. Same dedicated vehicle & captain throughout.
        </p>
        <button type="button" class="btn-select-cab" style="width: auto; padding: 8px 16px; font-size: 13px;" onclick="window.closeAllModals(); document.getElementById('booking-hero').scrollIntoView({behavior: 'smooth'})">Book Round Trip</button>
      </div>

      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 20px;">
        <div style="color: var(--owc-primary); margin-bottom: 10px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <h3 style="font-size: 17px; font-weight: 800; color: var(--owc-text); margin-bottom: 6px;">Patna Darshan & Hourly Rentals</h3>
        <p style="font-size: 13px; color: var(--owc-text-muted); line-height: 1.5; margin-bottom: 14px;">
          4Hr/40KM, 8Hr/80KM, or 12Hr/120KM packages for Patna Sahib Gurudwara, Mahavir Mandir, AIIMS, Secretariat meetings, or shopping.
        </p>
        <button type="button" class="btn-select-cab" style="width: auto; padding: 8px 16px; font-size: 13px;" onclick="window.closeAllModals(); document.getElementById('booking-hero').scrollIntoView({behavior: 'smooth'})">Book Local Package</button>
      </div>

      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 20px;">
        <div style="color: var(--owc-primary); margin-bottom: 10px;">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>
        </div>
        <h3 style="font-size: 17px; font-weight: 800; color: var(--owc-text); margin-bottom: 6px;">Patna & Gaya Airport Express</h3>
        <p style="font-size: 13px; color: var(--owc-text-muted); line-height: 1.5; margin-bottom: 14px;">
          Doorstep airport transfers to Jay Prakash Narayan Airport (PAT) and Gaya Airport (GAY) with flight delay tracking and zero waiting penalty.
        </p>
        <button type="button" class="btn-select-cab" style="width: auto; padding: 8px 16px; font-size: 13px;" onclick="window.closeAllModals(); document.getElementById('booking-hero').scrollIntoView({behavior: 'smooth'})">Book Airport Express</button>
      </div>
    </div>
  `;

  modal.classList.add("open");
};

window.openRoutesModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-routes");
  const list = document.getElementById("modal-routes-list");
  const searchInput = document.getElementById("routes-search-input");
  if (!modal || !list) return;

  const render = (query = "") => {
    const q = query.toLowerCase();
    const matches = OTB_POPULAR_ROUTES.filter(r => 
      r.from.toLowerCase().includes(q) || 
      r.to.toLowerCase().includes(q) ||
      r.highway.toLowerCase().includes(q)
    );

    list.innerHTML = matches.map(r => `
      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <h4 style="font-size: 15px; font-weight: 800; color: var(--owc-text);">${r.from} → ${r.to}</h4>
          <span style="font-size: 16px; font-weight: 900; color: var(--owc-primary);">₹${r.baseFareHatchback}</span>
        </div>
        <div style="font-size: 12px; color: var(--owc-text-muted); margin-bottom: 12px;">
          ${r.distanceKm} KM • ${r.duration} • Toll ₹${r.toll} included
        </div>
        <button type="button" class="btn-select-cab" style="padding: 8px 14px; font-size: 12.5px;" onclick="window.bookingManager.loadRoutePreset('${r.fromId}', '${r.toId}')">
          Book This Route
        </button>
      </div>
    `).join("");
  };

  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = (e) => render(e.target.value.trim());
  }

  render();
  modal.classList.add("open");
};

window.openCorporateModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-corporate");
  const body = document.getElementById("modal-corporate-body");
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
      <div>
        <h3 style="font-size: 20px; font-weight: 800; color: var(--owc-text); margin-bottom: 8px;">${OTB_CORPORATE_DATA.title}</h3>
        <p style="font-size: 13.5px; color: var(--owc-text-muted); line-height: 1.6; margin-bottom: 18px;">${OTB_CORPORATE_DATA.subtitle}</p>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
          ${OTB_CORPORATE_DATA.features.map(f => `
            <div style="display: flex; gap: 10px; align-items: flex-start;">
              <span style="color: var(--owc-primary); display: inline-flex; align-items: center; margin-top: 2px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <div>
                <strong style="font-size: 13.5px; color: var(--owc-text);">${f.title}</strong>
                <div style="font-size: 12px; color: var(--owc-text-muted);">${f.desc}</div>
              </div>
            </div>
          `).join("")}
        </div>

        <div style="font-size: 12px; color: var(--owc-text-dim); font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">Trusted By Leading Organizations in Bihar:</div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${OTB_CORPORATE_DATA.trustedBy.map(c => `
            <span style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); padding: 4px 10px; border-radius: var(--radius-sm); font-size: 11.5px; font-weight: 600;">${c}</span>
          `).join("")}
        </div>
      </div>

      <!-- Corporate Inquiry Form -->
      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 20px;">
        <h4 style="font-size: 16px; font-weight: 800; margin-bottom: 12px;">Corporate Inquiry Desk</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px;">
          <input type="text" class="promo-input" placeholder="Company / Institution Name" id="corp-company">
          <input type="text" class="promo-input" placeholder="GSTIN Number (Optional)" id="corp-gstin">
          <input type="text" class="promo-input" placeholder="Contact Person Name" id="corp-person">
          <input type="tel" class="promo-input" placeholder="Official Mobile Number" id="corp-phone">
          <input type="email" class="promo-input" placeholder="Official Email Address" id="corp-email">
        </div>
        <button type="button" class="check-fare-primary-btn" style="margin-bottom: 0;" onclick="window.submitCorporateInquiry()">
          Submit Corporate Inquiry
        </button>
      </div>
    </div>
  `;

  modal.classList.add("open");
};

window.submitCorporateInquiry = () => {
  window.showToast("Corporate inquiry submitted! Our Patna business desk will contact you within 2 hours.", "success");
  window.closeAllModals();
};

// Review Storage Loader & Helpers
function getActiveReviews() {
  const base = window.OTB_PASSENGER_REVIEWS || window.OTB_FRIENDS_REVIEWS || [];
  try {
    const saved = localStorage.getItem("otb_custom_reviews");
    if (saved) {
      const custom = JSON.parse(saved);
      return [...custom, ...base];
    }
  } catch (e) {
    console.warn("Could not load custom reviews", e);
  }
  return base;
}

window.openFriendsReviewModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-friends-review");
  const grid = document.getElementById("fr-modal-reviews-grid");
  const searchInput = document.getElementById("fr-modal-search");
  if (!modal || !grid) return;

  const render = (query = "") => {
    const q = query.toLowerCase();
    const list = getActiveReviews();
    const matches = list.filter(r => 
      r.name.toLowerCase().includes(q) || 
      (r.city && r.city.toLowerCase().includes(q)) ||
      r.route.toLowerCase().includes(q) ||
      r.comment.toLowerCase().includes(q)
    );

    grid.innerHTML = matches.map(rev => `
      <div style="background: var(--owc-card-bg); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 18px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: ${rev.avatarBg || '#0095f6'}; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800;">
                ${rev.initials || rev.name.charAt(0)}
              </div>
              <div>
                <strong style="font-size: 14px; color: var(--owc-text);">${rev.name}</strong>
                <div style="font-size: 11px; color: var(--owc-text-muted);">${rev.city || 'Bihar'}</div>
              </div>
            </div>
            <span style="background: rgba(0, 149, 246, 0.1); color: var(--owc-primary); font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: var(--radius-full);">
              ${rev.badge || 'Verified Review'}
            </span>
          </div>

          <div style="font-size: 12.5px; color: var(--owc-primary); font-weight: 700; margin-bottom: 6px;">
            ${rev.route} • ${rev.car}
          </div>

          <div style="color: #f59e0b; font-size: 13px; font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${rev.rating} / 5.0 Rating</span>
          </div>

          <p style="font-size: 13px; color: var(--owc-text); line-height: 1.5; margin-bottom: 8px;">
            "${rev.comment}"
          </p>
        </div>
      </div>
    `).join("");
  };

  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = (e) => render(e.target.value.trim());
  }

  render();
  modal.classList.add("open");
};

// Open "Write a Review" Modal
window.openWriteReviewModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-write-review");
  const form = document.getElementById("form-submit-review");
  if (form) form.reset();
  if (modal) modal.classList.add("open");
};

// Handle Review Submission
window.handleReviewSubmit = (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("rev-input-name");
  const routeInput = document.getElementById("rev-input-route");
  const carInput = document.getElementById("rev-input-car");
  const ratingInput = document.getElementById("rev-input-rating");
  const commentInput = document.getElementById("rev-input-comment");

  const name = nameInput ? nameInput.value.trim() : "";
  const route = routeInput ? routeInput.value.trim() : "";
  const car = carInput ? carInput.value : "Prime Sedan";
  const rating = ratingInput ? parseFloat(ratingInput.value) : 4.8;
  const comment = commentInput ? commentInput.value.trim() : "";

  if (!name || !route || !comment) {
    window.showToast("Please complete all required fields", "warning");
    return;
  }

  const initials = name.split(" ").map(w => w.charAt(0).toUpperCase()).slice(0, 2).join("");
  const newReview = {
    id: "user_rev_" + Date.now(),
    initials: initials || "P",
    name: name,
    avatarBg: "#0095f6",
    city: "Bihar",
    route: route,
    car: car,
    rating: rating,
    badge: "Verified Passenger Review",
    verified: true,
    comment: comment
  };

  try {
    const existing = JSON.parse(localStorage.getItem("otb_custom_reviews") || "[]");
    existing.unshift(newReview);
    localStorage.setItem("otb_custom_reviews", JSON.stringify(existing));
  } catch (err) {
    console.warn("Could not save review locally", err);
  }

  if (window.OTB_PASSENGER_REVIEWS) {
    window.OTB_PASSENGER_REVIEWS.unshift(newReview);
  }

  // Update Hero feed
  if (window.bookingManager && window.bookingManager.renderFriendsHeroReviews) {
    window.bookingManager.renderFriendsHeroReviews();
  }

  window.closeAllModals();
  window.showToast("Thank you! Your verified review has been published.", "success");
  
  // Re-open reviews modal to show newly published review
  setTimeout(() => {
    window.openFriendsReviewModal();
  }, 400);
};

window.openFareChartModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-fare-chart");
  const body = document.getElementById("modal-fare-body");
  if (!modal || !body) return;

  body.innerHTML = `
    <div>
      <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 6px;">OneWayTaxiBihar Per-KM Rate Matrix</h3>
      <p style="font-size: 13px; color: var(--owc-text-muted); margin-bottom: 16px;">Transparent pricing across all 38 districts of Bihar with zero dead-mileage return charges.</p>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>Vehicle Category</th>
            <th>Models</th>
            <th>Capacity</th>
            <th>One-Way Rate</th>
            <th>Night Allowance (10PM-6AM)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Go Hatchback</strong></td>
            <td>WagonR, Tiago, Celerio</td>
            <td>4 Pax + 2 Bags</td>
            <td>₹21.0 / KM</td>
            <td>₹250</td>
          </tr>
          <tr>
            <td><strong>Prime Sedan</strong></td>
            <td>Dzire, Etios, Amaze</td>
            <td>4 Pax + 3-4 Bags</td>
            <td>₹25.0 / KM</td>
            <td>₹250</td>
          </tr>
          <tr>
            <td><strong>Executive Sedan</strong></td>
            <td>Honda City, Ciaz</td>
            <td>4 Pax + 4 Bags</td>
            <td>₹29.0 / KM</td>
            <td>₹250</td>
          </tr>
          <tr>
            <td><strong>Family SUV (6+1)</strong></td>
            <td>Ertiga, Carens + Carrier</td>
            <td>6 Pax + 5 Bags</td>
            <td>₹33.0 / KM</td>
            <td>₹250</td>
          </tr>
          <tr>
            <td><strong>Toyota Innova Crysta</strong></td>
            <td>Toyota Innova Crysta</td>
            <td>7 Pax + 6-7 Bags</td>
            <td>₹44.0 / KM</td>
            <td>₹250</td>
          </tr>
        </tbody>
      </table>

      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-md); padding: 14px; font-size: 12.5px; color: var(--owc-text-muted); line-height: 1.6;">
        <strong>Highway Tolls &amp; Taxes:</strong> All one-way route prices include standard fastag toll taxes, state road taxes, and 5% GST. No extra cash demands on bridges and highways.
      </div>
    </div>
  `;

  modal.classList.add("open");
};

window.openInvoiceModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-invoice");
  if (modal) modal.classList.add("open");
};

window.lookupTaxInvoice = async () => {
  const input = document.getElementById("invoice-lookup-id");
  const slot = document.getElementById("invoice-render-slot");
  const bookingId = input ? input.value.trim() : "";

  if (!bookingId) {
    window.showToast("Please enter a Booking ID (e.g. OTB-2026-8942)", "warning");
    return;
  }

  const rides = await ApiClient.getRides();
  const found = rides.find(r => r.bookingId.toUpperCase() === bookingId.toUpperCase()) || rides[0];

  if (!found) {
    slot.innerHTML = `<div style="text-align: center; color: var(--owc-danger); padding: 20px;">No invoice found for ${bookingId}.</div>`;
    return;
  }

  slot.innerHTML = `
    <div style="border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 24px; background: var(--owc-card-bg);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--owc-primary); padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 22px; font-weight: 900; color: var(--owc-primary); margin-bottom: 2px;">OneWayTaxiBihar</h2>
          <div style="font-size: 11.5px; color: var(--owc-text-muted);">OneWay Mobility Solutions Private Limited • GSTIN: 10AAECO1234F1Z8</div>
          <div style="font-size: 11.5px; color: var(--owc-text-muted);">Boring Road, Patna, Bihar - 800001 • Contact: +91 72818 51011</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; font-weight: 700; color: var(--owc-text-dim);">TAX INVOICE</div>
          <strong style="font-size: 15px; color: var(--owc-text);">${found.bookingId}</strong>
          <div style="font-size: 11.5px; color: var(--owc-text-muted); margin-top: 2px;">Date: ${found.pickupDate || '2026-09-01'}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 12.5px;">
        <div style="background: var(--owc-slate-50); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--owc-border);">
          <strong style="color: var(--owc-text); display: block; margin-bottom: 4px;">Billed To (Passenger):</strong>
          <div>${found.passengerName || 'Valued Passenger'}</div>
          <div>Phone: ${found.passengerPhone || 'Registered Contact'}</div>
          <div>Pickup: ${found.pickupAddress || found.originCity || 'Patna'}</div>
          <div>Drop: ${found.dropAddress || found.destCity || 'Gaya'}</div>
        </div>

        <div style="background: var(--owc-slate-50); padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--owc-border);">
          <strong style="color: var(--owc-text); display: block; margin-bottom: 4px;">Trip & Vehicle Details:</strong>
          <div>Cab Tier: ${found.fleetClass || 'Prime Sedan'} (${found.fleetModel || 'Dzire'})</div>
          <div>Vehicle Plate: ${found.driverDetails ? found.driverDetails.vehicleNumber : 'Shared after confirmation'}</div>
          <div>Assigned Driver: ${found.driverDetails ? `${found.driverDetails.name} (${found.driverDetails.phone})` : 'Shared after confirmation'}</div>
          <div>Payment Status: ${found.paymentStatus || 'Verified'} (${found.paymentMethod || 'UPI / QR'})</div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
        <thead>
          <tr style="background: var(--owc-slate-100); text-align: left; border-bottom: 1px solid var(--owc-border);">
            <th style="padding: 8px 10px;">Item Description</th>
            <th style="padding: 8px 10px;">SAC Code</th>
            <th style="padding: 8px 10px;">Rate Details</th>
            <th style="padding: 8px 10px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--owc-border-light);">
            <td style="padding: 10px;">One-Way Outstation Fare (${found.originCity || 'Patna'} to ${found.destCity || 'Gaya'})</td>
            <td>996412</td>
            <td>Fixed One-Way Rate</td>
            <td>₹${Math.round(found.totalFare * 0.95).toLocaleString('en-IN')}</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--owc-border-light);">
            <td style="padding: 10px;">Goods & Services Tax (GST 5%)</td>
            <td>996412</td>
            <td>GST @ 5%</td>
            <td>₹${Math.round(found.totalFare * 0.05).toLocaleString('en-IN')}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <th colspan="3" style="text-align: right; padding-top: 10px;">Total Amount Paid:</th>
            <th style="font-size: 16px; color: var(--owc-primary); padding-top: 10px;">₹${found.totalFare.toLocaleString('en-IN')}</th>
          </tr>
        </tfoot>
      </table>

      <div style="text-align: right; margin-top: 14px;">
        <button type="button" class="btn-select-cab" style="width: auto; padding: 8px 20px;" onclick="window.print()">Print / Save as PDF</button>
      </div>
    </div>
  `;
};

window.openCityPresenceModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-cities");
  const grid = document.getElementById("cities-modal-grid");
  const searchInput = document.getElementById("cities-modal-search");
  if (!modal || !grid) return;

  const render = (query = "") => {
    const q = query.toLowerCase();
    const matches = OTB_CITIES.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.hindiName && c.hindiName.includes(query)) ||
      c.division.toLowerCase().includes(q) ||
      (c.tag && c.tag.toLowerCase().includes(q))
    );

    grid.innerHTML = matches.map(c => `
      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-md); padding: 12px; cursor: pointer; transition: all var(--transition-fast);" onclick="window.bookingManager.loadRoutePreset('patna', '${c.id}')">
        <div style="font-weight: 700; font-size: 13.5px; color: var(--owc-text);">${c.name} <span style="font-weight: 400; color: var(--owc-primary);">(${c.hindiName || ''})</span></div>
        <div style="font-size: 11px; color: var(--owc-text-muted);">${c.division} Division • ${c.tag || c.state}</div>
      </div>
    `).join("");
  };

  if (searchInput) {
    searchInput.value = "";
    searchInput.oninput = (e) => render(e.target.value.trim());
  }

  render();
  modal.classList.add("open");
};

/* ==========================================================================
   5. LIVE GPS DRIVER TRACKING SIMULATION
   ========================================================================== */
window.startLiveTrackingSimulation = async (bookingId) => {
  window.closeAllModals();
  const modal = document.getElementById("modal-tracking");
  const body = document.getElementById("modal-tracking-body");
  if (!modal || !body) return;

  const rides = await ApiClient.getRides();
  const ride = rides.find(r => r.bookingId === bookingId) || rides[0];

  if (!ride) {
    window.showToast("No active ride found to track. Book a cab to start tracking!", "info");
    return;
  }

  const driverName = ride.captainName || "Executive Partner Driver (Assigning)";
  const driverPhone = ride.captainPhone || "+91 80021 41816";
  const driverVehicle = ride.vehicleNumber || "Verified Executive Fleet";
  const statusNotice = ride.partnerNotice || "Our partner/driver or agent will call you in 5 minutes to confirm booking.";

  body.innerHTML = `
    <div>
      <div style="background: var(--owc-slate-900); color: white; border-radius: var(--radius-lg); padding: 20px; text-align: center; margin-bottom: 20px; position: relative; overflow: hidden;">
        <div style="font-size: 12px; color: var(--owc-yellow); font-weight: 800; letter-spacing: 1px; margin-bottom: 4px;">CAB DISPATCH RADAR</div>
        <h3 style="font-size: 18px; font-weight: 800;">Booking ID: <span style="color: var(--owc-primary);">${ride.bookingId}</span></h3>
        <p style="font-size: 12.5px; color: #94a3b8; margin-top: 6px;">${statusNotice}</p>
      </div>

      <!-- Partner Dispatch Notice Card -->
      <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background: var(--owc-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <strong style="font-size: 15px; color: var(--owc-text);">${driverName}</strong>
              <div style="font-size: 12px; color: var(--owc-text-muted);">${driverVehicle} • ${ride.fleetClass || 'Prime Sedan'}</div>
            </div>
          </div>
        </div>

        <div style="font-size: 13px; color: var(--owc-text-muted); line-height: 1.6; border-top: 1px dashed var(--owc-border); padding-top: 10px;">
          Route: <strong>${ride.originCity} → ${ride.destCity}</strong><br>
          Pickup Date & Time: <strong>${ride.pickupDate} at ${ride.pickupTime}</strong><br>
          Payable: <strong>₹${ride.totalFare ? ride.totalFare.toLocaleString('en-IN') : '0'}</strong> (${ride.paymentMethod || 'Cash / UPI'})
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <a href="tel:+918002141816" class="btn-select-cab" style="text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; background: #0095f6; flex: 1; min-width: 180px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
          Call Helpdesk (+91 80021 41816)
        </a>
        <a href="https://wa.me/917281851011?text=Hello%20OneWayTaxiBihar%2C%20checking%20status%20for%20booking%20${ride.bookingId}" target="_blank" rel="noopener noreferrer" class="btn-nav-outline" style="flex: 1; min-width: 180px; display: flex; align-items: center; justify-content: center; gap: 6px; text-decoration: none;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z"/></svg>
          WhatsApp Desk
        </a>
      </div>
    </div>
  `;

  modal.classList.add("open");
  document.body.classList.add("modal-open");
  history.pushState({ modal: "modal-tracking" }, "", "#modal-tracking");
};

/* ==========================================================================
   6. GLOBAL UI HELPERS, TOASTS & MODAL DISMISSAL WITH BROWSER BACK BUTTON
   ========================================================================== */
window.closeAllModals = (updateHistory = true) => {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("open"));
  document.body.classList.remove("modal-open");
  if (updateHistory && window.location.hash) {
    try {
      history.pushState(null, "", window.location.pathname + window.location.search);
    } catch (e) {}
  }
};

// Copy UPI ID Helper
window.copyUpiId = (upiId) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(upiId).then(() => {
      window.showToast(`UPI ID copied: ${upiId}`, "success");
    }).catch(() => {
      window.showToast(`UPI ID: ${upiId}`, "info");
    });
  } else {
    window.showToast(`UPI ID: ${upiId}`, "info");
  }
};

// Global Back Navigation Handler (Supports Android Physical Back, Browser Back, and Modal Back Buttons)
window.handleBackNavigation = () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.closeAllModals(false);
  }
};

window.openHelpModal = () => {
  window.closeAllModals(false);
  const modal = document.getElementById("modal-help-support");
  if (modal) {
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    history.pushState({ modal: "modal-help-support" }, "", "#modal-help-support");
  }
};

// Phone/Browser Back Button & Swipe Back Handler (Preserves all form data)
window.addEventListener("popstate", () => {
  const openModal = document.querySelector(".modal-overlay.open");
  if (openModal) {
    const isCheckout = openModal.id === "modal-checkout";
    window.closeAllModals(false);
    if (isCheckout) {
      const fleetSection = document.getElementById("cab-selection-section") || document.getElementById("results-section");
      if (fleetSection) {
        fleetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }
  const drawer = document.getElementById("mobile-drawer");
  if (drawer && drawer.classList.contains("open")) {
    drawer.classList.remove("open");
  }
});

window.closeMobileDrawer = () => {
  const d = document.getElementById("mobile-drawer");
  if (d) d.classList.remove("open");
};

function setupMobileDrawer() {
  const btn = document.getElementById("btn-hamburger");
  const drawer = document.getElementById("mobile-drawer");
  if (btn && drawer) {
    btn.addEventListener("click", () => {
      drawer.classList.toggle("open");
    });
  }
}

function setupGlobalModalEvents() {
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        window.closeAllModals();
      }
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.closeAllModals();
      window.closeMobileDrawer();
    }
  });

  // Mobile Bottom Quick Bar Scroll Visibility
  const bar = document.getElementById("mobile-quick-bar");
  const hero = document.getElementById("booking-hero");
  if (bar && hero) {
    window.addEventListener("scroll", () => {
      if (document.body.classList.contains("modal-open")) {
        bar.style.display = "none";
        return;
      }
      const heroBottom = hero.offsetTop + hero.offsetHeight - 80;
      if (window.scrollY > heroBottom && window.innerWidth <= 768) {
        bar.style.display = "block";
      } else {
        bar.style.display = "none";
      }
    }, { passive: true });
  }
}

window.showToast = (msg, type = "info") => {
  let toastContainer = document.getElementById("owc-toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "owc-toast-container";
    toastContainer.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  const bg = type === "success" ? "#059669" : type === "danger" ? "#dc2626" : type === "warning" ? "#d97706" : "#05a357";
  toast.style.cssText = `background: ${bg}; color: white; padding: 12px 20px; border-radius: 12px; font-size: 13.5px; font-weight: 600; box-shadow: 0 10px 25px rgba(0,0,0,0.25); transform: translateY(20px); opacity: 0; transition: all 0.3s ease; pointer-events: auto;`;
  toast.textContent = msg;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.transform = "translateY(0)";
    toast.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    toast.style.transform = "translateY(20px)";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

window.selectFleetCategory = (cabId) => {
  if (window.bookingManager) {
    window.bookingManager.selectCabTier(cabId);
    document.getElementById("cab-selection-section")?.scrollIntoView({ behavior: "smooth" });
  }
};

window.printTaxInvoice = (bookingId) => {
  window.openInvoiceModal();
  const input = document.getElementById("invoice-lookup-id");
  if (input) input.value = bookingId;
  window.lookupTaxInvoice();
};

/* ==========================================================================
   THEME CONTROLLER (SLEEK TOGGLE SWITCH - ZERO FRONT TEXT)
   ========================================================================== */
class ThemeManager {
  constructor() {
    this.storageKey = "owc_theme_preference";
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this.init();
  }

  init() {
    const preference = this.getPreference();
    this.applyTheme(preference);
    this.setupListeners();
    this.updateUI(preference);
  }

  getPreference() {
    try {
      return localStorage.getItem(this.storageKey) || "light";
    } catch (e) {
      return "light";
    }
  }

  getResolvedTheme(pref = this.getPreference()) {
    if (pref === "system") {
      return this.mediaQuery.matches ? "dark" : "light";
    }
    return pref === "dark" ? "dark" : "light";
  }

  toggleTheme() {
    const current = this.getResolvedTheme();
    const next = current === "dark" ? "light" : "dark";
    this.setTheme(next);
  }

  setTheme(mode) {
    if (!["light", "dark", "system"].includes(mode)) return;
    try {
      localStorage.setItem(this.storageKey, mode);
    } catch (e) {
      console.warn("Could not save theme to localStorage", e);
    }
    this.applyTheme(mode);
    this.updateUI(mode);
    
    if (window.showToast) {
      window.showToast(mode === "dark" ? "Dark mode activated" : "Light mode activated", "info");
    }
  }

  applyTheme(pref) {
    const resolved = this.getResolvedTheme(pref);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme-mode", pref);
  }

  setupListeners() {
    // Listen to OS system changes if in system mode
    const handleOSChange = () => {
      if (this.getPreference() === "system") {
        this.applyTheme("system");
        this.updateUI("system");
      }
    };

    if (this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener("change", handleOSChange);
    } else if (this.mediaQuery.addListener) {
      this.mediaQuery.addListener(handleOSChange);
    }

    // Attach click handlers to desktop and mobile switch buttons
    const desktopBtn = document.getElementById("theme-switch-btn");
    const mobileBtn = document.getElementById("mobile-theme-switch-btn");

    if (desktopBtn) {
      desktopBtn.addEventListener("click", () => this.toggleTheme());
    }
    if (mobileBtn) {
      mobileBtn.addEventListener("click", () => this.toggleTheme());
    }
  }

  updateUI(pref) {
    const resolved = this.getResolvedTheme(pref);
    const isDark = resolved === "dark";

    const desktopIcon = document.getElementById("theme-switch-icon");
    const mobileIcon = document.getElementById("mobile-theme-switch-icon");
    const desktopBtn = document.getElementById("theme-switch-btn");
    const mobileBtn = document.getElementById("mobile-theme-switch-btn");
    const mobileLabel = document.getElementById("mobile-theme-label");

    const sunSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    const iconHtml = isDark ? moonSvg : sunSvg;
    const titleText = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";

    if (desktopIcon) desktopIcon.innerHTML = iconHtml;
    if (mobileIcon) mobileIcon.innerHTML = iconHtml;

    if (desktopBtn) desktopBtn.title = titleText;
    if (mobileBtn) mobileBtn.title = titleText;

    if (mobileLabel) {
      mobileLabel.innerHTML = isDark 
        ? `Dark Theme (Active)` 
        : `Light Theme (Active)`;
    }
  }
}

/* ==========================================================================
   TOP CALL BAR PREFERENCE
   ========================================================================== */
window.toggleCallBar = (collapse) => {
  const callBar = document.getElementById("header-top-bar");
  const miniPill = document.getElementById("navbar-call-mini-pill");
  if (collapse) {
    if (callBar) callBar.classList.add("collapsed");
    if (miniPill) miniPill.style.display = "inline-flex";
    document.body.classList.add("call-bar-collapsed");
    sessionStorage.setItem("call_bar_collapsed", "true");
  } else {
    if (callBar) callBar.classList.remove("collapsed");
    if (miniPill) miniPill.style.display = "none";
    document.body.classList.remove("call-bar-collapsed");
    sessionStorage.removeItem("call_bar_collapsed");
  }
};

// Restore call bar preference on page load
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem("call_bar_collapsed") === "true") {
    window.toggleCallBar(true);
  }
});



