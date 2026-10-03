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
   1. LEAFLET EXECUTIVE GPS RADAR & TELEMETRY CONTROLLER FOR BIHAR
   ========================================================================== */
class OneWayMapManager {
  constructor(containerId) {
    this.containerId = containerId;
    this.map = null;
    this.originMarker = null;
    this.destMarker = null;
    this.routePolyline = null;
    this.routeGlowPolyline = null;
    this.fleetMarkers = [];
    this.fleetAnimInterval = null;
    this.lastRouteSignature = null;
    this.currentLayerType = "dark"; // "dark" | "voyager" | "satellite"
    this.tileLayers = {};
    this.routePoints = [];
    this.debounceTimer = null;
  }

  initMap() {
    const el = document.getElementById(this.containerId);
    if (!el || typeof L === "undefined") return;

    // Center of Bihar (Patna-Gaya-Muzaffarpur triangle)
    this.map = L.map(this.containerId, {
      center: [25.5941, 85.1376],
      zoom: 8,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      fadeAnimation: true,
      zoomAnimation: true
    });

    // Custom sleek zoom control top-right
    L.control.zoom({ position: "topright" }).addTo(this.map);

    // High-Resolution Tile Layers
    this.tileLayers.dark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    });

    this.tileLayers.voyager = L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: '&copy; CartoDB &copy; OpenStreetMap'
    });

    this.tileLayers.satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: '&copy; Esri Satellite'
    });

    // Determine initial tile layer from theme
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    this.setLayer(isDark ? "dark" : "voyager");

    // Listen to theme switch events
    window.addEventListener("themeChanged", (e) => {
      const mode = e.detail?.theme;
      if (this.currentLayerType !== "satellite") {
        this.setLayer(mode === "light" ? "voyager" : "dark");
      }
    });

    // Bind HUD layer switchers & recenter button
    this.bindHudControls();

    // Default Bihar Corridor Overview
    this.spawnDefaultCaptains();
  }

  setLayer(type) {
    if (!this.map || !this.tileLayers[type]) return;
    Object.values(this.tileLayers).forEach((layer) => {
      if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
    });
    this.tileLayers[type].addTo(this.map);
    this.currentLayerType = type;

    // Update active class on buttons
    const btns = document.querySelectorAll(".radar-layer-btn");
    btns.forEach((btn) => {
      if (btn.dataset.layer === type) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  bindHudControls() {
    const btns = document.querySelectorAll(".radar-layer-btn");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const layerType = btn.dataset.layer;
        if (layerType) this.setLayer(layerType);
      });
    });

    const recenterBtn = document.getElementById("radar-recenter-btn");
    if (recenterBtn) {
      recenterBtn.addEventListener("click", () => {
        this.focusCurrentRoute();
      });
    }
  }

  focusCurrentRoute() {
    if (!this.map) return;
    if (this.routePoints && this.routePoints.length >= 2) {
      const bounds = L.latLngBounds(this.routePoints);
      this.map.flyToBounds(bounds, {
        padding: [60, 60],
        maxZoom: 11,
        duration: 1.2,
        easeLinearity: 0.25
      });
    } else {
      this.map.flyTo([25.5941, 85.1376], 8, { duration: 1.0 });
    }
  }

  refreshSize() {
    if (this.map) {
      this.map.invalidateSize({ animate: false });
    }
  }

  getHighwayCorridorName(originCity, destCity) {
    const o = (originCity.name || "").toLowerCase();
    const d = (destCity.name || "").toLowerCase();
    const combined = `${o} ${d}`;

    if (combined.includes("gaya") || combined.includes("bodhgaya") || combined.includes("jehanabad")) {
      return "NH-83 Patna-Gaya-Dobhi 4-Lane E-Way";
    }
    if (combined.includes("muzaffarpur") || combined.includes("darbhanga") || combined.includes("madhubani") || combined.includes("sitamarhi")) {
      return "NH-27 East-West Expressway & Gandhi Setu";
    }
    if (combined.includes("bhagalpur") || combined.includes("munger") || combined.includes("begusarai") || combined.includes("khagaria")) {
      return "NH-31 Mokama-Bhagalpur Ganga Corridor";
    }
    if (combined.includes("chapra") || combined.includes("siwan") || combined.includes("gopalganj")) {
      return "NH-531 JP Setu & Saran Expressway";
    }
    if (combined.includes("purnia") || combined.includes("katihar") || combined.includes("saharsa") || combined.includes("kishanganj")) {
      return "NH-31 / NH-27 Kosi-Seemanchal E-Way";
    }
    if (combined.includes("sasaram") || combined.includes("buxar") || combined.includes("dehri") || combined.includes("aurangabad")) {
      return "NH-922 / NH-19 Grand Trunk Expressway";
    }
    if (combined.includes("airport")) {
      return "Patna Airport Dedicated Fastag Corridor";
    }
    return "Bihar NH State Highway Inter-District Grid";
  }

  updateRoute(originCity, destCity, distanceKm) {
    if (!this.map || typeof L === "undefined") return;
    if (!originCity || !destCity || !originCity.lat || !destCity.lat) return;

    const signature = `${originCity.lat.toFixed(3)}_${originCity.lng.toFixed(3)}_${destCity.lat.toFixed(3)}_${destCity.lng.toFixed(3)}_${distanceKm}`;
    if (this.lastRouteSignature === signature) {
      // Avoid rapid zoom jitter if route did not change
      return;
    }
    this.lastRouteSignature = signature;

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this._renderRoute(originCity, destCity, distanceKm);
    }, 120);
  }

  _renderRoute(originCity, destCity, distanceKm) {
    if (!this.map) return;

    const oLat = originCity.lat;
    const oLng = originCity.lng;
    const dLat = destCity.lat;
    const dLng = destCity.lng;

    // Clean previous markers and polylines
    if (this.originMarker) this.map.removeLayer(this.originMarker);
    if (this.destMarker) this.map.removeLayer(this.destMarker);
    if (this.routePolyline) this.map.removeLayer(this.routePolyline);
    if (this.routeGlowPolyline) this.map.removeLayer(this.routeGlowPolyline);
    this.clearFleetMarkers();

    // High-tech holographic Origin Marker (Emerald Pulse)
    const originIcon = L.divIcon({
      className: "radar-hologram-pin",
      html: `
        <div class="radar-origin-beacon">
          <div class="beacon-sonar-wave"></div>
          <div class="beacon-core-dot origin-dot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>
          </div>
          <div class="beacon-pill origin-pill">
            <span class="beacon-code">PICKUP</span>
            <span class="beacon-city">${originCity.name}</span>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    // High-tech holographic Destination Marker (Cyan Beacon)
    const destIcon = L.divIcon({
      className: "radar-hologram-pin",
      html: `
        <div class="radar-dest-beacon">
          <div class="beacon-sonar-wave dest-wave"></div>
          <div class="beacon-core-dot dest-dot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
          </div>
          <div class="beacon-pill dest-pill">
            <span class="beacon-code">DEST</span>
            <span class="beacon-city">${destCity.name}</span>
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    this.originMarker = L.marker([oLat, oLng], { icon: originIcon, zIndexOffset: 1000 })
      .addTo(this.map)
      .bindPopup(`
        <div class="radar-popup-card">
          <div class="radar-popup-tag origin">PICKUP HUB</div>
          <div class="radar-popup-title">${originCity.name} (${originCity.hindiName || ''})</div>
          <div class="radar-popup-sub">${originCity.state || 'Bihar'} • Doorstep Chauffeur Pickup</div>
        </div>
      `);

    this.destMarker = L.marker([dLat, dLng], { icon: destIcon, zIndexOffset: 1000 })
      .addTo(this.map)
      .bindPopup(`
        <div class="radar-popup-card">
          <div class="radar-popup-tag dest">DROP TERMINAL</div>
          <div class="radar-popup-title">${destCity.name} (${destCity.hindiName || ''})</div>
          <div class="radar-popup-sub">${destCity.state || 'Bihar'} • Guaranteed One-Way Fare</div>
        </div>
      `);

    // Smooth highway spline calculation
    const pointsCount = 14;
    const curvePoints = [];
    const dx = dLng - oLng;
    const dy = dLat - oLat;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const curveOffset = Math.sin(Math.atan2(dy, dx)) * 0.07 * (dist > 1.2 ? 1.1 : 0.6);

    for (let i = 0; i <= pointsCount; i++) {
      const t = i / pointsCount;
      const curLat = oLat + dy * t + Math.sin(t * Math.PI) * curveOffset;
      const curLng = oLng + dx * t + Math.sin(t * Math.PI) * (curveOffset * 0.55);
      curvePoints.push([curLat, curLng]);
    }
    this.routePoints = curvePoints;

    // Outer Ambient Glow Polyline
    this.routeGlowPolyline = L.polyline(curvePoints, {
      color: "#00d2ff",
      weight: 8,
      opacity: 0.38,
      lineCap: "round",
      lineJoin: "round",
      className: "radar-neon-route-glow"
    }).addTo(this.map);

    // High-Contrast Core Route Polyline
    this.routePolyline = L.polyline(curvePoints, {
      color: "#10b981",
      weight: 3.5,
      opacity: 0.95,
      dashArray: "8, 10",
      lineCap: "round",
      className: "radar-neon-route-core"
    }).addTo(this.map);

    // Smooth Cinematic Zoom FlyToBounds (Fixing jitter)
    const bounds = L.latLngBounds(curvePoints);
    this.map.flyToBounds(bounds, {
      padding: [65, 65],
      maxZoom: 11,
      duration: 1.25,
      easeLinearity: 0.25
    });

    // Update HUD Metrics
    this.updateHudTelemetry(originCity, destCity, distanceKm);

    // Spawn and Animate Live Chauffeur Telemetry Blips
    this.spawnCorridorChauffeurs(curvePoints);
  }

  updateHudTelemetry(originCity, destCity, distanceKm) {
    const titleEl = document.getElementById("radar-corridor-title");
    const subEl = document.getElementById("radar-corridor-sub");
    const highwayVal = document.getElementById("radar-val-highway");
    const distVal = document.getElementById("radar-val-dist");
    const timeVal = document.getElementById("radar-val-time");
    const tollVal = document.getElementById("radar-val-toll");
    const fleetVal = document.getElementById("radar-fleet-count");

    const highwayName = this.getHighwayCorridorName(originCity, destCity);

    if (titleEl) titleEl.textContent = `${originCity.name} ➔ ${destCity.name} Corridor`;
    if (subEl) subEl.textContent = `Express Telemetry • ${highwayName} • All 38 Bihar Districts Linked`;
    if (highwayVal) highwayVal.textContent = highwayName.split(" ")[0] + " " + (highwayName.split(" ")[1] || "");
    if (distVal) distVal.textContent = `${distanceKm || 120} KM`;
    
    // Estimate Duration
    const estHours = Math.floor((distanceKm || 120) / 45);
    const estMins = Math.round((((distanceKm || 120) % 45) / 45) * 60);
    const timeStr = `${estHours > 0 ? estHours + 'h ' : ''}${estMins}m`;
    if (timeVal) timeVal.textContent = timeStr;

    if (tollVal) tollVal.textContent = "FASTag Auto-Cleared";
    if (fleetVal) fleetVal.textContent = `${Math.floor(Math.random() * 4) + 5} Verified Captains`;
  }

  clearFleetMarkers() {
    if (this.fleetAnimInterval) {
      clearInterval(this.fleetAnimInterval);
      this.fleetAnimInterval = null;
    }
    this.fleetMarkers.forEach((m) => {
      if (this.map && this.map.hasLayer(m)) {
        this.map.removeLayer(m);
      }
    });
    this.fleetMarkers = [];
  }

  spawnCorridorChauffeurs(curvePoints) {
    this.clearFleetMarkers();
    if (!curvePoints || curvePoints.length < 3) return;

    const fleetProfiles = [
      { name: "Captain Santosh", cab: "Swift Dzire", reg: "BR-01-PK", speed: 64, rating: "4.9★", t: 0.22, color: "#10b981" },
      { name: "Captain Rajesh", cab: "Toyota Innova", reg: "BR-02-RX", speed: 68, rating: "4.8★", t: 0.52, color: "#00d2ff" },
      { name: "Captain Manoj", cab: "Maruti Ertiga", reg: "BR-06-TC", speed: 72, rating: "4.9★", t: 0.78, color: "#f59e0b" }
    ];

    fleetProfiles.forEach((profile) => {
      const idx = Math.min(curvePoints.length - 1, Math.floor(profile.t * (curvePoints.length - 1)));
      const pt = curvePoints[idx];

      const carIcon = L.divIcon({
        className: "radar-chauffeur-blip",
        html: `
          <div class="radar-cab-pod" style="--pod-color: ${profile.color};">
            <span class="pod-radar-pulse"></span>
            <div class="pod-icon-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
            </div>
            <div class="pod-live-tag">
              <span class="pod-cab-name">${profile.cab}</span>
              <span class="pod-speed">${profile.speed} km/h</span>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([pt[0], pt[1]], { icon: carIcon })
        .addTo(this.map)
        .bindPopup(`
          <div class="radar-popup-card">
            <div class="radar-popup-tag verified">5G VERIFIED CHAUFFEUR</div>
            <div class="radar-popup-title">${profile.name} (${profile.rating})</div>
            <div class="radar-popup-sub">${profile.cab} • ${profile.reg} • Speed: ${profile.speed} km/h</div>
            <div class="radar-popup-badge">⚡ FASTag Monitored • SOS Protected</div>
          </div>
        `);

      this.fleetMarkers.push(marker);
    });

    // Subtle smooth motion animation along highway spline (no camera jitter)
    let step = 0;
    this.fleetAnimInterval = setInterval(() => {
      step++;
      fleetProfiles.forEach((profile, i) => {
        const marker = this.fleetMarkers[i];
        if (!marker) return;
        const currentT = (profile.t + (step * 0.004)) % 1;
        const indexFloat = currentT * (curvePoints.length - 1);
        const lowIdx = Math.floor(indexFloat);
        const highIdx = Math.min(curvePoints.length - 1, lowIdx + 1);
        const subT = indexFloat - lowIdx;
        
        const p1 = curvePoints[lowIdx];
        const p2 = curvePoints[highIdx];
        const lat = p1[0] + (p2[0] - p1[0]) * subT;
        const lng = p1[1] + (p2[1] - p1[1]) * subT;
        marker.setLatLng([lat, lng]);
      });
    }, 1800);
  }

  spawnDefaultCaptains() {
    const hubPoints = [
      { name: "Patna Central Chauffeur", cab: "Swift Dzire", lat: 25.60, lng: 85.14, speed: 58 },
      { name: "Gaya Highway Chauffeur", cab: "Toyota Innova", lat: 24.79, lng: 85.00, speed: 65 },
      { name: "Muzaffarpur Express Hub", cab: "Maruti Ertiga", lat: 26.12, lng: 85.39, speed: 62 }
    ];

    hubPoints.forEach((profile) => {
      const carIcon = L.divIcon({
        className: "radar-chauffeur-blip",
        html: `
          <div class="radar-cab-pod" style="--pod-color: #10b981;">
            <span class="pod-radar-pulse"></span>
            <div class="pod-icon-box">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
            </div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker([profile.lat, profile.lng], { icon: carIcon }).addTo(this.map);
      this.fleetMarkers.push(marker);
    });
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
  window.currentUser = currentUser;
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
      <div class="drawer-user-card" onclick="window.closeMobileDrawer(); window.openAuthModal();" style="cursor: pointer;">
        <div class="drawer-user-avatar">?</div>
        <div class="drawer-user-info">
          <div class="drawer-user-name">Login / Register</div>
          <div class="drawer-user-phone">Claim ₹100 Welcome Bonus</div>
        </div>
      </div>
    `;
    if (navSlot) navSlot.innerHTML = htmlDesktop;
    if (mobileSlot) mobileSlot.innerHTML = htmlMobile;
  }
}

// Global Logout Handler
window.handleLogout = async () => {
  await ApiClient.logout();
  currentUser = null;
  window.currentUser = null;
  renderNavAuth();
  window.closeAllModals();
  window.showToast("Logged out successfully.", "info");
};

let _authCountdownTimer = null;

// Open Auth Modal with Optional Booking Context & Auto Phone Fill
window.openAuthModal = (bookingContext = null) => {
  window.closeAllModals(false);
  const modal = document.getElementById("modal-auth");
  const nameInput = document.getElementById("auth-name-input");
  const phoneInput = document.getElementById("auth-mobile-input");
  const contextBanner = document.getElementById("auth-booking-context-banner");
  const cabTitleEl = document.getElementById("auth-booking-cab-title");
  const discountNoteEl = document.getElementById("auth-booking-discount-note");
  const modalTitle = document.getElementById("auth-modal-title");
  const modalSub = document.getElementById("auth-modal-sub");

  window.showAuthPhoneStep();

  // Pre-fill phone from fare check or localStorage if available
  const existingPhone = window.bookingManager?.userPhone || localStorage.getItem("oneway_fare_phone") || "";
  if (phoneInput) {
    phoneInput.value = existingPhone ? existingPhone.replace(/\D/g, "").slice(-10) : "";
  }
  if (nameInput && !nameInput.value) {
    nameInput.value = window.currentUser?.name || "";
  }

  // Display booking context if opened by tapping a cab
  if (bookingContext) {
    if (contextBanner) contextBanner.style.display = "block";
    if (cabTitleEl) cabTitleEl.textContent = `Selected Cab: ${bookingContext.cabName || 'Outstation Cab'} (₹${(bookingContext.price || 0).toLocaleString('en-IN')})`;
    if (discountNoteEl) {
      const discounted = Math.max(0, (bookingContext.price || 0) - 100);
      discountNoteEl.innerHTML = `🎁 <strong>₹100 Welcome Reward</strong> will apply automatically! (Payable: ₹${discounted.toLocaleString('en-IN')})`;
    }
    if (modalTitle) modalTitle.textContent = "Login & Claim ₹100 Ride Reward";
    if (modalSub) modalSub.textContent = "Verify your mobile number to lock in your cab reservation with ₹100 instant discount.";
  } else {
    if (contextBanner) contextBanner.style.display = "none";
    if (modalTitle) modalTitle.textContent = "Login & Claim ₹100 in Wallet";
    if (modalSub) modalSub.textContent = "Get ₹100 Welcome Bonus on your first cab booking with real mobile number verification.";
  }

  if (modal) {
    modal.classList.add("open");
    document.body.classList.add("modal-open");
    history.pushState({ modal: "modal-auth" }, "", "#modal-auth");
    if (phoneInput && !phoneInput._boundEnter) {
      phoneInput._boundEnter = true;
      phoneInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          window.handleDirectLogin();
        }
      });
    }
    if (nameInput && !nameInput._boundEnter) {
      nameInput._boundEnter = true;
      nameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (phoneInput && !phoneInput.value) {
            phoneInput.focus();
          } else {
            window.handleDirectLogin();
          }
        }
      });
    }

    setTimeout(() => {
      if (phoneInput && phoneInput.value && nameInput && !nameInput.value) {
        nameInput.focus();
      } else if (phoneInput && !phoneInput.value) {
        phoneInput.focus();
      }
    }, 150);
  }
};

window.showAuthPhoneStep = () => {
  const stepPhone = document.getElementById("auth-step-phone");
  const stepOtp = document.getElementById("auth-step-otp");
  if (stepPhone) stepPhone.style.display = "block";
  if (stepOtp) stepOtp.style.display = "none";
  if (_authCountdownTimer) clearInterval(_authCountdownTimer);
};

// Send Real Verification Code (SMS & WhatsApp)
window.handleSendVerificationCode = async (isResend = false) => {
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

  const btnSend = document.getElementById("btn-auth-send-code");
  if (btnSend) {
    btnSend.disabled = true;
    btnSend.textContent = "Sending Verification Code...";
  }

  try {
    const res = await ApiClient.sendOtp(phone, name);
    if (res && res.success) {
      // Setup Step 2 UI
      const stepPhone = document.getElementById("auth-step-phone");
      const stepOtp = document.getElementById("auth-step-otp");
      const targetPhoneLabel = document.getElementById("auth-target-phone-label");
      const deliveredCodeEl = document.getElementById("auth-delivered-code");
      const waLinkEl = document.getElementById("auth-wa-verify-link");

      if (targetPhoneLabel) targetPhoneLabel.textContent = `+91 ${phone}`;
      if (deliveredCodeEl && res.otpCode) deliveredCodeEl.textContent = res.otpCode;
      if (waLinkEl && res.whatsappUrl) waLinkEl.setAttribute("href", res.whatsappUrl);

      if (stepPhone) stepPhone.style.display = "none";
      if (stepOtp) stepOtp.style.display = "block";

      // Set & focus digit inputs
      for (let i = 1; i <= 4; i++) {
        const dInput = document.getElementById(`otp-digit-${i}`);
        if (dInput) {
          dInput.value = (res.otpCode && res.otpCode[i - 1]) ? res.otpCode[i - 1] : "";
          setupOtpDigitInput(dInput, i);
        }
      }
      setTimeout(() => {
        const d4 = document.getElementById("otp-digit-4");
        if (d4 && d4.value) {
          d4.focus();
        } else {
          document.getElementById("otp-digit-1")?.focus();
        }
      }, 100);

      // Start 30s Countdown
      startAuthCountdown();

      window.showToast(isResend 
        ? `New verification code dispatched to +91 ${phone}!` 
        : `Verification code dispatched to +91 ${phone}!`, "success");
    } else {
      window.showToast(res?.message || "Failed to dispatch verification code. Please try again.", "warning");
    }
  } catch (err) {
    console.error("sendOtp error:", err);
    window.showToast("Network error while requesting verification code.", "warning");
  } finally {
    if (btnSend) {
      btnSend.disabled = false;
      btnSend.textContent = "Verify Mobile & Claim ₹100 Reward →";
    }
  }
};

function setupOtpDigitInput(input, index) {
  input.oninput = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    e.target.value = val ? val.slice(-1) : "";
    if (val && index < 4) {
      document.getElementById(`otp-digit-${index + 1}`)?.focus();
    }
    // Auto-verify when 4th digit entered
    if (index === 4 && val) {
      const code = [1, 2, 3, 4].map(i => document.getElementById(`otp-digit-${i}`)?.value || "").join("");
      if (code.length === 4) {
        window.handleVerifyOtpCode();
      }
    }
  };

  input.onkeydown = (e) => {
    if (e.key === "Backspace" && !e.target.value && index > 1) {
      const prev = document.getElementById(`otp-digit-${index - 1}`);
      if (prev) {
        prev.focus();
        prev.value = "";
      }
    }
  };
}

function startAuthCountdown() {
  if (_authCountdownTimer) clearInterval(_authCountdownTimer);
  let seconds = 30;
  const cdEl = document.getElementById("auth-countdown");
  const wrapEl = document.getElementById("auth-resend-wrap");
  const btnResend = document.getElementById("auth-resend-btn");

  if (wrapEl) wrapEl.style.display = "inline";
  if (btnResend) btnResend.style.display = "none";
  if (cdEl) cdEl.textContent = seconds;

  _authCountdownTimer = setInterval(() => {
    seconds--;
    if (cdEl) cdEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(_authCountdownTimer);
      if (wrapEl) wrapEl.style.display = "none";
      if (btnResend) btnResend.style.display = "inline";
    }
  }, 1000);
}

// Verify Code & Claim ₹100 Welcome Reward
window.handleVerifyOtpCode = async () => {
  const nameInput = document.getElementById("auth-name-input");
  const phoneInput = document.getElementById("auth-mobile-input");
  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim().replace(/\D/g, "").slice(-10) : "";

  const digits = [1, 2, 3, 4].map(i => document.getElementById(`otp-digit-${i}`)?.value || "").join("");
  if (digits.length !== 4) {
    window.showToast("Please enter the complete 4-digit verification code", "warning");
    document.getElementById(`otp-digit-${digits.length + 1}`)?.focus();
    return;
  }

  const btnVerify = document.getElementById("btn-auth-verify-code");
  if (btnVerify) {
    btnVerify.disabled = true;
    btnVerify.textContent = "Verifying...";
  }

  try {
    const res = await ApiClient.verifyOtp(phone, digits, name);
    if (res && res.success && res.user) {
      currentUser = res.user;
      window.currentUser = res.user;
      renderNavAuth();

      // Check if this was initiated by tapping a cab to book
      if (window.bookingManager && window.bookingManager.pendingCheckout) {
        const { cabId, price } = window.bookingManager.pendingCheckout;
        window.bookingManager.pendingCheckout = null;

        window.closeAllModals(false);
        const rewardMsg = res.isFirstTimeUser
          ? `🎉 Phone verified! ₹100 Welcome Reward applied to your ${cabId.toUpperCase()} cab!`
          : `🎉 Verified! Welcome back, ${currentUser.name}!`;
        window.showToast(rewardMsg, "success");

        // Automatically launch checkout for the selected cab
        window.bookingManager.startCheckout(cabId, price);
      } else {
        window.closeAllModals();
        window.showToast(res.message || "Mobile number verified successfully!", "success");
      }
    } else {
      window.showToast(res?.message || "Invalid verification code. Please check and try again.", "warning");
    }
  } catch (err) {
    console.error("verifyOtp error:", err);
    window.showToast("Verification failed. Please check connection.", "warning");
  } finally {
    if (btnVerify) {
      btnVerify.disabled = false;
      btnVerify.textContent = "Verify Code & Claim ₹100 →";
    }
  }
};

// Genuine Instant 1-Click Direct Passenger Login (Criteria 1: Name + Mobile, Zero OTP required)
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

  const btnDirect = document.getElementById("btn-auth-direct-login");
  const origText = btnDirect ? btnDirect.textContent : "";
  if (btnDirect) {
    btnDirect.disabled = true;
    btnDirect.textContent = "Logging In...";
  }

  try {
    const res = await ApiClient.directLogin(name, phone);
    if (res && res.success && res.user) {
      currentUser = res.user;
      window.currentUser = res.user;
      renderNavAuth();

      // Check if this was initiated by tapping a cab to book
      if (window.bookingManager && window.bookingManager.pendingCheckout) {
        const { cabId, price } = window.bookingManager.pendingCheckout;
        window.bookingManager.pendingCheckout = null;

        window.closeAllModals(false);
        const rewardMsg = `🎉 Welcome, ${currentUser.name}! Logged in successfully & ₹100 Welcome Reward applied!`;
        window.showToast(rewardMsg, "success");

        // Automatically launch checkout for the selected cab
        window.bookingManager.startCheckout(cabId, price);
      } else {
        window.closeAllModals();
        window.showToast(`🎉 Welcome, ${currentUser.name}! You are logged in with ₹100 in your wallet.`, "success");
      }
    } else {
      window.showToast(res?.message || "Login failed. Please check your credentials.", "warning");
    }
  } catch (err) {
    console.error("directLogin error:", err);
    window.showToast("Connection error during login. Please try again.", "warning");
  } finally {
    if (btnDirect) {
      btnDirect.disabled = false;
      btnDirect.textContent = origText || "Instant 1-Click Login & Claim ₹100 →";
    }
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
        • ₹100 Welcome bonus credited on passenger registration (one-time per user)<br>
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
window.currentTripsTab = "upcoming";

window.openMyTripsModal = async () => {
  window.closeAllModals(false);
  const modal = document.getElementById("modal-my-trips");
  const body = document.getElementById("modal-my-trips-body");
  if (!modal || !body) return;

  const rides = await ApiClient.getRides();
  const ledgerRes = await ApiClient.getWalletLedger();
  const ledger = (ledgerRes && ledgerRes.success) ? (ledgerRes.ledger || ledgerRes.transactions || []) : [];

  const upcomingRides = rides.filter(r => r.bookingStatus !== 'COMPLETED' && r.bookingStatus !== 'CANCELLED');
  const completedRides = rides.filter(r => r.bookingStatus === 'COMPLETED');
  const cancelledRides = rides.filter(r => r.bookingStatus === 'CANCELLED');

  const renderRideCard = (r, isUpcoming = false) => {
    let statusLabel = r.bookingStatus || 'REQUESTED';
    let statusColor = '#059669';
    let statusBg = 'rgba(5, 150, 105, 0.12)';

    switch(statusLabel) {
      case 'REQUESTED':
        statusLabel = 'REQUESTED (Call in 5m)';
        statusColor = '#d97706';
        statusBg = 'rgba(217, 119, 6, 0.12)';
        break;
      case 'CONFIRMED':
        statusLabel = 'CONFIRMED';
        statusColor = '#0284c7';
        statusBg = 'rgba(2, 132, 199, 0.12)';
        break;
      case 'DRIVER ASSIGNED':
        statusLabel = 'DRIVER ASSIGNED';
        statusColor = '#9333ea';
        statusBg = 'rgba(147, 51, 234, 0.12)';
        break;
      case 'DRIVER ON THE WAY':
      case 'ON THE WAY':
        statusLabel = 'CHAUFFEUR ON THE WAY';
        statusColor = '#ea580c';
        statusBg = 'rgba(234, 88, 12, 0.12)';
        break;
      case 'ARRIVED':
        statusLabel = 'CHAUFFEUR ARRIVED AT PICKUP';
        statusColor = '#4f46e5';
        statusBg = 'rgba(79, 70, 229, 0.12)';
        break;
      case 'TRIP STARTED':
        statusLabel = 'TRIP IN PROGRESS';
        statusColor = '#059669';
        statusBg = 'rgba(5, 150, 105, 0.15)';
        break;
      case 'COMPLETED':
        statusLabel = 'TRIP COMPLETED';
        statusColor = '#059669';
        statusBg = 'rgba(5, 150, 105, 0.12)';
        break;
      case 'CANCELLED':
        statusLabel = 'CANCELLED (₹0 FEE)';
        statusColor = '#dc2626';
        statusBg = 'rgba(220, 38, 38, 0.12)';
        break;
      case 'REJECTED':
        statusLabel = 'REJECTED (NO FLEET)';
        statusColor = '#b91c1c';
        statusBg = 'rgba(185, 28, 28, 0.12)';
        break;
      case 'NO SHOW':
        statusLabel = 'NO SHOW';
        statusColor = '#64748b';
        statusBg = 'rgba(100, 116, 139, 0.12)';
        break;
    }

    const payStatusColor = (r.paymentStatus && r.paymentStatus.includes('PAID')) ? '#059669' : '#d97706';

    return `
      <div style="background: var(--owc-card-bg); border: 1.5px solid var(--owc-border); border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
          <div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="background: var(--owc-primary-subtle); color: var(--owc-primary); font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; font-family: monospace;">
                ${r.bookingId}
              </span>
              <span style="background: ${statusBg}; color: ${statusColor}; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px;">
                ${statusLabel}
              </span>
            </div>
            <h4 style="font-size: 16px; font-weight: 800; color: var(--owc-text); margin-top: 4px; margin-bottom: 2px;">
              ${r.originCity} ➔ ${r.destCity}
            </h4>
            <div style="font-size: 11.5px; color: var(--owc-text-muted);">
              📍 Pickup: ${r.pickupAddress || `${r.originCity} Doorstep`} • Drop: ${r.dropAddress || `${r.destCity} Destination`}
            </div>
          </div>

          <div style="text-align: right;">
            <span style="font-size: 18px; font-weight: 900; color: var(--owc-primary);">₹${(r.totalFare || 0).toLocaleString('en-IN')}</span>
            <div style="font-size: 11px; font-weight: 700; color: ${payStatusColor};">
              ${r.paymentStatus || 'Pending'} (${r.paymentMethod || 'UPI'})
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: var(--owc-text-muted); background: var(--owc-slate-50); padding: 8px 12px; border-radius: 8px; margin-bottom: 12px;">
          <span>📅 <strong>${r.pickupDate}</strong> at <strong>${r.pickupTime}</strong></span>
          <span>🚗 <strong>${r.fleetClass}</strong> (${r.fleetModel})</span>
          <span>👤 ${r.passengerName} (${r.passengerPhone})</span>
        </div>

        <!-- Driver Info / 5-Minute Confirmation Note -->
        <div style="font-size: 12px; margin-bottom: 12px; color: var(--owc-text);">
          ${r.driverDetails ? `
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(59, 130, 246, 0.08); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
              <span style="font-weight: 800; color: #0284c7;">Assigned Chauffeur:</span>
              <strong>${r.driverDetails.name}</strong> (${r.driverDetails.phone}) • <span style="font-family: monospace;">${r.driverDetails.vehicleNumber}</span>
            </div>
          ` : `
            <div style="font-size: 11.5px; color: #059669; font-weight: 600; display: flex; align-items: center; gap: 6px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Our partner/driver or agent will call you in 5 minutes to confirm booking. Driver details shared upon confirmation.
            </div>
          `}
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; border-top: 1px dashed var(--owc-border); padding-top: 10px; flex-wrap: wrap;">
          ${r.bookingStatus !== 'CANCELLED' ? `
            <button type="button" class="btn-select-cab" style="padding: 6px 14px; font-size: 12px; width: auto;" onclick="window.startLiveTrackingSimulation('${r.bookingId}')">
              Track Live GPS
            </button>
            <button type="button" class="btn-nav-outline" style="padding: 6px 14px; font-size: 12px;" onclick="window.printTaxInvoice('${r.bookingId}')">
              Tax Invoice
            </button>
          ` : `
            <span style="font-size: 11.5px; color: #ef4444; font-weight: 700; align-self: center;">This booking was cancelled with ₹0 fee.</span>
          `}
          ${isUpcoming ? `
            <button type="button" style="background: transparent; border: 1px solid var(--owc-danger); color: var(--owc-danger); padding: 6px 14px; border-radius: var(--radius-md); font-size: 12px; font-weight: 700; cursor: pointer;" onclick="window.cancelRideWithRefund('${r.bookingId}')">
              Cancel (₹0 Fee)
            </button>
          ` : ''}
        </div>
      </div>
    `;
  };

  const renderEmptyState = (msg, iconSvg) => `
    <div style="text-align: center; padding: 36px 16px; background: var(--owc-slate-50); border-radius: var(--radius-lg); border: 1.5px dashed var(--owc-border);">
      <div style="font-size: 32px; color: var(--owc-text-muted); margin-bottom: 8px;">
        ${iconSvg || '🚕'}
      </div>
      <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 4px; color: var(--owc-text);">${msg}</h4>
      <p style="font-size: 12.5px; color: var(--owc-text-muted); margin-bottom: 14px;">Travel intercity anywhere in Bihar with certified AC cabs and transparent fares.</p>
      <button type="button" class="btn-select-cab" style="width: auto; padding: 8px 20px; font-size: 12.5px;" onclick="window.closeAllModals(); document.getElementById('booking-hero').scrollIntoView({behavior: 'smooth'})">
        Book One-Way Cab Now
      </button>
    </div>
  `;

  body.innerHTML = `
    <!-- Top Account & Wallet Banner -->
    <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid var(--owc-border); padding-bottom: 12px;">
      <div>
        <h3 style="font-size: 17px; font-weight: 800; color: var(--owc-text); margin: 0 0 4px 0;">Customer Trips &amp; Wallet Hub</h3>
        <p style="font-size: 12.5px; color: var(--owc-text-muted); margin: 0;">
          ${currentUser ? `<strong>${currentUser.name || 'Passenger'}</strong> (${currentUser.phone || ''})` : 'Manage your Bihar outstation bookings & invoices'}
        </p>
      </div>

      <!-- Wallet Balance Pill (Req 146) -->
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid #059669; color: #065f46; padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 6px;">
          <span>Wallet Balance:</span>
          <span style="color: #059669; font-size: 15px;">₹${currentUser ? (currentUser.walletBalance || 100) : 100}</span>
        </div>
        ${currentUser ? `
          <button type="button" class="btn-logout-danger" style="padding: 6px 12px; font-size: 12px;" onclick="window.handleLogout()">
            Logout
          </button>
        ` : ''}
      </div>
    </div>

    <!-- 4 Filter Tabs (Req 145, 147) -->
    <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 1px solid var(--owc-border-light);">
      <button type="button" class="admin-filter-pill ${window.currentTripsTab === 'upcoming' ? 'active' : ''}" id="tab-btn-upcoming" onclick="window.switchCustomerTab('upcoming')">
        Upcoming Trips (${upcomingRides.length})
      </button>
      <button type="button" class="admin-filter-pill ${window.currentTripsTab === 'completed' ? 'active' : ''}" id="tab-btn-completed" onclick="window.switchCustomerTab('completed')">
        Completed Trips (${completedRides.length})
      </button>
      <button type="button" class="admin-filter-pill ${window.currentTripsTab === 'cancelled' ? 'active' : ''}" id="tab-btn-cancelled" onclick="window.switchCustomerTab('cancelled')">
        Cancelled (${cancelledRides.length})
      </button>
      <button type="button" class="admin-filter-pill ${window.currentTripsTab === 'wallet' ? 'active' : ''}" id="tab-btn-wallet" onclick="window.switchCustomerTab('wallet')">
        Wallet Ledger (${ledger.length})
      </button>
    </div>

    <!-- Tab 1: Upcoming Trips -->
    <div id="customer-tab-upcoming" style="display: ${window.currentTripsTab === 'upcoming' ? 'flex' : 'none'}; flex-direction: column; gap: 12px; max-height: 460px; overflow-y: auto;">
      ${upcomingRides.length === 0 ? renderEmptyState("No upcoming trips found.") : upcomingRides.map(r => renderRideCard(r, true)).join("")}
    </div>

    <!-- Tab 2: Completed Trips -->
    <div id="customer-tab-completed" style="display: ${window.currentTripsTab === 'completed' ? 'flex' : 'none'}; flex-direction: column; gap: 12px; max-height: 460px; overflow-y: auto;">
      ${completedRides.length === 0 ? renderEmptyState("No completed trips yet.") : completedRides.map(r => renderRideCard(r, false)).join("")}
    </div>

    <!-- Tab 3: Cancelled Trips -->
    <div id="customer-tab-cancelled" style="display: ${window.currentTripsTab === 'cancelled' ? 'flex' : 'none'}; flex-direction: column; gap: 12px; max-height: 460px; overflow-y: auto;">
      ${cancelledRides.length === 0 ? renderEmptyState("No cancelled trips.", "✓") : cancelledRides.map(r => renderRideCard(r, false)).join("")}
    </div>

    <!-- Tab 4: Wallet Transaction History (Req 147) -->
    <div id="customer-tab-wallet" style="display: ${window.currentTripsTab === 'wallet' ? 'block' : 'none'}; max-height: 460px; overflow-y: auto;">
      <div style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); color: white; border-radius: 12px; padding: 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">AVAILABLE WALLET CREDIT</div>
          <div style="font-size: 28px; font-weight: 900;">₹${currentUser ? (currentUser.walletBalance || 100) : 100}</div>
          <div style="font-size: 12px; opacity: 0.95; margin-top: 2px;">Applicable automatically for ₹100 instant discount on bookings</div>
        </div>
        <div style="font-size: 36px; opacity: 0.85;">👛</div>
      </div>

      <div style="font-size: 13px; font-weight: 800; color: var(--owc-text); margin-bottom: 8px;">WALLET TRANSACTION AUDIT TRAIL</div>
      ${ledger.length === 0 ? `
        <div style="text-align: center; padding: 24px; color: var(--owc-text-muted); font-size: 13px; background: var(--owc-slate-50); border-radius: 8px;">
          No wallet transactions recorded yet. Complete bookings to earn referral rewards.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${ledger.map(tx => {
            const isCredit = tx.type === 'CREDIT' || tx.type === 'REFUND';
            const color = isCredit ? '#059669' : '#dc2626';
            const sign = isCredit ? '+' : '-';
            return `
              <div style="background: var(--owc-card-bg); border: 1px solid var(--owc-border); border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: var(--owc-text);">${tx.description || tx.type}</div>
                  <div style="font-size: 11px; color: var(--owc-text-muted);">${new Date(tx.createdAt).toLocaleString()} • Ref: ${tx.id}</div>
                </div>
                <div style="text-align: right;">
                  <span style="font-weight: 900; font-size: 15px; color: ${color};">${sign}₹${tx.amount}</span>
                  <div style="font-size: 11px; color: var(--owc-text-muted);">Bal: ₹${tx.balanceAfter}</div>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      `}
    </div>
  `;

  modal.classList.add("open");
  document.body.classList.add("modal-open");
  history.pushState({ modal: "modal-my-trips" }, "", "#modal-my-trips");
};

window.switchCustomerTab = (tab) => {
  window.currentTripsTab = tab;
  const tabs = ["upcoming", "completed", "cancelled", "wallet"];
  tabs.forEach(t => {
    const panel = document.getElementById(`customer-tab-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (panel) panel.style.display = (t === tab) ? (t === 'wallet' ? 'block' : 'flex') : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
};

window.cancelRideWithRefund = async (bookingId) => {
  if (confirm(`Are you sure you want to cancel booking ${bookingId}?\nOneWayTaxiBihar has ZERO cancellation charges. Any wallet deduction will be 100% refunded immediately.`)) {
    await ApiClient.cancelBooking(bookingId);
    window.showToast(`Booking ${bookingId} cancelled with ₹0 fee. 100% refunded to wallet!`, "success");
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

window.openPrivacyModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-info-doc");
  const title = document.getElementById("modal-info-title");
  const body = document.getElementById("modal-info-body");
  if (!modal || !title || !body) return;

  title.textContent = "Privacy & Data Protection Policy";
  body.innerHTML = `
    <div style="font-size: 13.5px; color: var(--owc-text); line-height: 1.7;">
      <p style="color: var(--owc-text-muted); font-size: 12px; margin-bottom: 16px;">Last Updated: September 2026 • OneWayTaxiBihar Mobility (Boring Road, Patna, Bihar - 800001)</p>
      
      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">1. Information We Collect</h4>
      <p>We only collect information strictly required to coordinate and operate your intercity outstation ride: your name, 10-digit Indian mobile number, pickup and drop addresses, and travel dates. We do not require or collect passwords from passengers.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">2. Chauffeur Contact Privacy</h4>
      <p>Your mobile phone number is strictly shielded and only disclosed to your assigned driver after dispatch confirmation for pickup coordination. Drivers are prohibited from retaining customer numbers after trip completion.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">3. Zero Spam & Data Monetization</h4>
      <p>We do not sell, rent, or trade your personal data with third-party advertisers or lead brokers. All communications are strictly transactional regarding your booked rides, driver details, and billing receipts.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">4. Data Security & Storage</h4>
      <p>All data is transmitted via industry-standard TLS encryption. Payment transactions are executed directly through authorized UPI payment gateways (Beneficiary: HIMANSHU KUMAR DUBEY). We never store debit/credit card numbers or UPI PINs.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">5. Data Deletion Requests</h4>
      <p>You may request deletion of your account, ride history, and personal contact info by contacting dispatch at <strong>+91 80021 41816</strong> or WhatsApp <strong>+91 72818 51011</strong>.</p>
    </div>
  `;
  modal.classList.add("open");
};

window.openTermsModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-info-doc");
  const title = document.getElementById("modal-info-title");
  const body = document.getElementById("modal-info-body");
  if (!modal || !title || !body) return;

  title.textContent = "Terms & Conditions of Service";
  body.innerHTML = `
    <div style="font-size: 13.5px; color: var(--owc-text); line-height: 1.7;">
      <p style="color: var(--owc-text-muted); font-size: 12px; margin-bottom: 16px;">Effective: September 2026 • OneWayTaxiBihar Mobility (Patna, Bihar)</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">1. Nature of Service</h4>
      <p>OneWayTaxiBihar operates as an outstation point-to-point mobility coordinator connecting verified commercial drivers and vehicle owners across Bihar's 38 districts with passengers seeking dedicated one-way and roundtrip cab services.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">2. Booking Lifecycle</h4>
      <p>Placing an enquiry creates a <strong>REQUESTED</strong> booking. Our Patna central dispatch team or assigned partner will call you within 5 minutes to confirm flight/train timings and doorstep pickup landmarks before confirming the trip.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">3. Fare Inclusions & Fastag Tolls</h4>
      <p>All published one-way fares include vehicle hire, fuel, driver allowance, and standard highway Fastag tolls on the designated direct route. Non-standard diversions or extra local waiting exceeding 45 minutes may incur additional charges payable directly to the chauffeur.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">4. Passenger Safety & Vehicle Standards</h4>
      <p>All assigned vehicles are commercial yellow-plate tourist cabs equipped with commercial insurance, GPS speed governors, and clean air-conditioned interiors. Smoking, consumption of alcohol, or transport of contraband is strictly prohibited under Bihar state laws.</p>
    </div>
  `;
  modal.classList.add("open");
};

window.openCancellationModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-info-doc");
  const title = document.getElementById("modal-info-title");
  const body = document.getElementById("modal-info-body");
  if (!modal || !title || !body) return;

  title.textContent = "Cancellation & 100% Refund Policy";
  body.innerHTML = `
    <div style="font-size: 13.5px; color: var(--owc-text); line-height: 1.7;">
      <p style="color: var(--owc-text-muted); font-size: 12px; margin-bottom: 16px;">Zero Cancellation Fee Guarantee • Patna Central Dispatch</p>

      <div style="background: rgba(5, 150, 105, 0.08); border: 1.5px solid var(--owc-success); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
        <strong style="color: #059669; font-size: 14px;">✓ ₹0 Cancellation Fee Promise</strong>
        <p style="margin: 4px 0 0 0; font-size: 12.5px; color: var(--owc-text);">Plans change, train schedules get rescheduled. Cancel your ride up to 2 hours prior to scheduled departure for a 100% full refund with zero cancellation charges.</p>
      </div>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">1. Cancellation Timelines</h4>
      <ul style="padding-left: 20px; margin: 6px 0;">
        <li><strong>Before Driver En Route (&gt; 2 hours):</strong> 100% Free Cancellation. Zero fees deducted.</li>
        <li><strong>Chauffeur En Route to Doorstep (&lt; 1 hour):</strong> A nominal dry-run fuel allowance of ₹300 may be deducted to compensate the partner driver.</li>
        <li><strong>Passenger No-Show:</strong> In case the passenger is unreachable for &gt; 45 minutes past the scheduled pickup time, the booking is marked as NO SHOW.</li>
      </ul>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">2. Refund Speed & Disbursement</h4>
      <ul style="padding-left: 20px; margin: 6px 0;">
        <li><strong>Customer Wallet Cash:</strong> 100% Instant credit to your OneWayTaxiBihar wallet balance with zero waiting period.</li>
        <li><strong>UPI / Bank Account / QR:</strong> Processed within 3 to 5 business working days directly to the original funding account.</li>
      </ul>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">3. How to Cancel</h4>
      <p>Simply tap <strong>My Trips</strong> on the website, select your active trip, and tap <strong>"Cancel Ride"</strong>. Alternatively, call our 24x7 helpdesk at <strong>+91 80021 41816</strong>.</p>
    </div>
  `;
  modal.classList.add("open");
};

window.openDriverTermsModal = () => {
  window.closeAllModals();
  const modal = document.getElementById("modal-info-doc");
  const title = document.getElementById("modal-info-title");
  const body = document.getElementById("modal-info-body");
  if (!modal || !title || !body) return;

  title.textContent = "Driver Partner Terms & Chauffeur Code of Conduct";
  body.innerHTML = `
    <div style="font-size: 13.5px; color: var(--owc-text); line-height: 1.7;">
      <p style="color: var(--owc-text-muted); font-size: 12px; margin-bottom: 16px;">OneWayTaxiBihar Fleet & Chauffeur Standards</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">1. Partner Eligibility & Documentation</h4>
      <p>Drivers must hold a valid commercial transport driving license, police background clearance certificate, vehicle fitness certificate, and commercial tourist permit. Private white-plate vehicles are strictly disallowed.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">2. Zero Extra Cash Demands</h4>
      <p>Drivers are strictly prohibited from demanding extra cash over the agreed system fare from passengers for AC usage, luggage loading, or normal highway toll gates.</p>

      <h4 style="color: var(--owc-primary); margin-top: 16px; margin-bottom: 6px;">3. Payouts & Disbursements</h4>
      <p>Payments for online advance collections are settled within 24 hours of trip completion via UPI or NEFT. Cash-to-driver collections remain with the chauffeur with commission adjusted against platform credit balance.</p>

      <p style="margin-top: 16px;">To register your cab in Patna, Muzaffarpur, Gaya, or Bhagalpur, contact partner onboarding at <strong>+91 80021 41816</strong>.</p>
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
  const found = rides.find(r => r.bookingId.toUpperCase() === bookingId.toUpperCase());

  if (!found) {
    slot.innerHTML = `<div style="text-align: center; color: var(--owc-danger); padding: 20px; font-weight: 700;">No booking found with ID "${bookingId}". Please check the ID in My Trips.</div>`;
    return;
  }

  const invNumber = `INV-2026-${(found.bookingId.replace(/\D/g, '') || '0000').slice(-4)}`;

  slot.innerHTML = `
    <div style="border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 24px; background: var(--owc-card-bg);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid var(--owc-primary); padding-bottom: 16px; margin-bottom: 20px;">
        <div>
          <h2 style="font-size: 22px; font-weight: 900; color: var(--owc-primary); margin-bottom: 2px;">OneWayTaxiBihar</h2>
          <div style="font-size: 11.5px; color: var(--owc-text-muted);">OneWayTaxiBihar Mobility (Beneficiary: HIMANSHU KUMAR DUBEY)</div>
          <div style="font-size: 11.5px; color: var(--owc-text-muted);">Boring Road, Patna, Bihar - 800001 • 24x7 Helpdesk: +91 80021 41816</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 11px; font-weight: 800; color: #059669; background: rgba(5, 150, 105, 0.1); padding: 2px 8px; border-radius: 4px; display: inline-block;">TAX INVOICE</div>
          <div style="font-size: 15px; font-weight: 800; color: var(--owc-text); margin-top: 4px;">${invNumber}</div>
          <div style="font-size: 11.5px; color: var(--owc-text-muted); margin-top: 2px;">Booking: ${found.bookingId}</div>
          <div style="font-size: 11.5px; color: var(--owc-text-muted);">Date: ${found.pickupDate || new Date().toISOString().split('T')[0]}</div>
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

// Copy UPI ID Helper with Visual Button Feedback
window.copyUpiId = (upiId, btnEl) => {
  const targetBtn = btnEl || document.querySelector(".checkout-btn-copy");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(upiId).then(() => {
      window.showToast(`UPI ID copied: ${upiId}`, "success");
      if (targetBtn) {
        const origText = targetBtn.innerHTML;
        targetBtn.innerHTML = `✓ Copied!`;
        targetBtn.style.background = "#059669";
        setTimeout(() => {
          targetBtn.innerHTML = origText;
          targetBtn.style.background = "#009af4";
        }, 2200);
      }
    }).catch(() => {
      window.showToast(`UPI ID: ${upiId}`, "info");
    });
  } else {
    window.showToast(`UPI ID: ${upiId}`, "info");
  }
};

// Global Back Navigation Handler (Supports Android Physical Back, Browser Back, Swipe Back, and Modal Back Buttons)
window.handleBackNavigation = () => {
  const drawer = document.getElementById("mobile-drawer");
  if (drawer && drawer.classList.contains("open")) {
    window.closeMobileDrawer(true);
    return;
  }

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
    if (window.history.length > 1 && window.location.hash) {
      try {
        history.back();
      } catch (e) {}
    }
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.closeAllModals(false);
    window.closeMobileDrawer(false);
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

// Phone / Browser Back Button & Swipe Back Handler (Preserves all form data)
window.addEventListener("popstate", (e) => {
  // 1. Close mobile drawer if open
  const drawer = document.getElementById("mobile-drawer");
  const backdrop = document.getElementById("drawer-backdrop");
  if (drawer && drawer.classList.contains("open")) {
    drawer.classList.remove("open");
    if (backdrop) backdrop.classList.remove("active");
    document.body.classList.remove("drawer-open");
    return;
  }

  // 2. Handle active modal if open
  const openModal = document.querySelector(".modal-overlay.open");
  if (openModal) {
    const isCheckout = openModal.id === "modal-checkout";
    window.closeAllModals(false);

    // If returning from checkout, return focus to cab selection
    if (isCheckout) {
      const fleetSection = document.getElementById("cab-selection-section") || document.getElementById("results-section");
      if (fleetSection) {
        fleetSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    return;
  }

  // 3. Handle step back from cab selection to hero booking form
  if (!window.location.hash || window.location.hash === "#hero" || window.location.hash === "") {
    const hero = document.getElementById("booking-hero");
    if (hero) {
      hero.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
});

window.openMobileDrawer = () => {
  const d = document.getElementById("mobile-drawer");
  const b = document.getElementById("drawer-backdrop");
  if (d) {
    d.classList.add("open");
    if (b) b.classList.add("active");
    document.body.classList.add("drawer-open");
    history.pushState({ drawer: true }, "", "#menu");
  }
};

window.closeMobileDrawer = (updateHistory = false) => {
  const d = document.getElementById("mobile-drawer");
  const b = document.getElementById("drawer-backdrop");
  if (d && d.classList.contains("open")) {
    d.classList.remove("open");
    if (b) b.classList.remove("active");
    document.body.classList.remove("drawer-open");
    if (updateHistory && window.location.hash === "#menu") {
      try {
        history.back();
      } catch (e) {}
    }
  }
};

// Global Escape Key Handler for Modals & Mobile Drawer
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const drawer = document.getElementById("mobile-drawer");
    if (drawer && drawer.classList.contains("open")) {
      window.closeMobileDrawer(true);
      return;
    }
    const openModal = document.querySelector(".modal-overlay.open");
    if (openModal) {
      window.closeAllModals(true);
    }
  }
});

function setupMobileDrawer() {
  const btn = document.getElementById("btn-hamburger");
  const drawer = document.getElementById("mobile-drawer");
  if (btn && drawer) {
    btn.addEventListener("click", () => {
      if (drawer.classList.contains("open")) {
        window.closeMobileDrawer(true);
      } else {
        window.openMobileDrawer();
      }
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
      return localStorage.getItem(this.storageKey) || "dark";
    } catch (e) {
      return "dark";
    }
  }

  getResolvedTheme(pref = this.getPreference()) {
    if (pref === "system") {
      return this.mediaQuery.matches ? "dark" : "dark";
    }
    return pref === "light" ? "light" : "dark";
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

/* ==========================================================================
   2026 AI MOBILITY COPILOT ASSISTANT CONTROLLER
   ========================================================================== */
window.toggleAiAssistant = (forceOpen) => {
  const windowEl = document.getElementById("ai-chat-window");
  if (!windowEl) return;

  const shouldOpen = forceOpen !== undefined ? Boolean(forceOpen) : windowEl.style.display === "none";
  if (shouldOpen) {
    windowEl.style.display = "flex";
    const input = document.getElementById("ai-chat-input");
    if (input) {
      setTimeout(() => input.focus(), 150);
    }
    const msgs = document.getElementById("ai-messages-area");
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  } else {
    windowEl.style.display = "none";
  }
};

window.sendAiQuickPrompt = (promptText) => {
  const input = document.getElementById("ai-chat-input");
  if (input) {
    input.value = promptText;
    window.toggleAiAssistant(true);
    window.handleAiSubmit();
  }
};

window.handleAiSubmit = async (e) => {
  if (e) e.preventDefault();
  const input = document.getElementById("ai-chat-input");
  const msgsArea = document.getElementById("ai-messages-area");
  if (!input || !msgsArea) return;

  const query = input.value.trim();
  if (!query) return;

  // Append user message
  const userBubble = document.createElement("div");
  userBubble.className = "ai-bubble ai-bubble-user";
  userBubble.textContent = query;
  msgsArea.appendChild(userBubble);
  input.value = "";
  msgsArea.scrollTop = msgsArea.scrollHeight;

  // Append typing indicator
  const loadingBubble = document.createElement("div");
  loadingBubble.className = "ai-bubble ai-bubble-bot ai-typing-bubble";
  loadingBubble.innerHTML = `<span class="ai-typing-dots"><span>.</span><span>.</span><span>.</span></span> Analyzing query with 2026 Mobility AI...`;
  msgsArea.appendChild(loadingBubble);
  msgsArea.scrollTop = msgsArea.scrollHeight;

  try {
    // Check if query is natural language trip booking intent
    const hasTripKeywords = /\b(cab|taxi|ride|from|to|tomorrow|today|car|sedan|suv|people|passenger|book)\b/i.test(query);
    let parsedIntent = null;
    
    if (hasTripKeywords && !/\b(track|where|status|cancel|refund|toll|gst|invoice)\b/i.test(query)) {
      try {
        const intentRes = await ApiClient.parseAiIntent(query);
        if (intentRes && intentRes.success && intentRes.intent && intentRes.intent.origin && intentRes.intent.destination) {
          parsedIntent = intentRes.intent;
        }
      } catch (err) {
        console.warn("Intent parse skip:", err);
      }
    }

    loadingBubble.remove();

    if (parsedIntent) {
      // Render interactive AI Trip Configuration Card
      const botBubble = document.createElement("div");
      botBubble.className = "ai-bubble ai-bubble-bot";
      botBubble.innerHTML = `
        <div class="ai-bot-name">⚡ OneWay AI Route Engine</div>
        <div>I analyzed your travel request and extracted your Bihar trip parameters:</div>
        <div style="background: rgba(2, 132, 199, 0.08); border: 1px solid rgba(2, 132, 199, 0.3); border-radius: 10px; padding: 10px 12px; margin: 10px 0;">
          <div style="font-weight: 800; color: #0284c7; font-size: 13.5px;">
            ${parsedIntent.origin} ➔ ${parsedIntent.destination}
          </div>
          <div style="font-size: 12px; color: var(--owc-text); margin-top: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
            <div>📅 <strong>Date:</strong> ${parsedIntent.pickupDate || 'Today'}</div>
            <div>⏰ <strong>Time:</strong> ${parsedIntent.pickupTime || '10:00 AM'}</div>
            <div>👥 <strong>Pax:</strong> ${parsedIntent.passengers || 4} Passengers</div>
            <div>🚘 <strong>Cab:</strong> ${(parsedIntent.recommendedTier || 'sedan').toUpperCase()}</div>
          </div>
        </div>
        <button type="button" class="btn-check-fare-primary" style="width: 100%; padding: 10px; font-size: 12.5px; font-weight: 800; border-radius: 8px; cursor: pointer;" onclick='window.applyAiParsedTrip(${JSON.stringify(parsedIntent).replace(/'/g, "&#39;")})'>
          ⚡ Autofill Trip & View Fares Now →
        </button>
      `;
      msgsArea.appendChild(botBubble);
    } else {
      // General support, booking lookup, or policy query
      const userPhone = window.currentUser?.phone || localStorage.getItem("oneway_fare_phone") || "";
      const supportRes = await ApiClient.askAiSupport({ query, phone: userPhone });
      
      const botBubble = document.createElement("div");
      botBubble.className = "ai-bubble ai-bubble-bot";
      
      if (supportRes && supportRes.success) {
        let extraHtml = "";
        if (supportRes.foundBooking) {
          const b = supportRes.foundBooking;
          extraHtml = `
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 10px 12px; margin: 8px 0; font-size: 12px;">
              <strong style="color: #10b981;">Active Booking: ${b.bookingId}</strong>
              <div>${b.originCity} ➔ ${b.destCity} • Status: <strong>${b.status}</strong></div>
              <div>Pickup: ${b.pickupDate} at ${b.pickupTime}</div>
              <div>Assigned Driver: <strong>${b.driverName || 'Central Partner Dispatch in Progress'}</strong></div>
            </div>
          `;
        }

        let waEscalateBtn = "";
        if (supportRes.escalateWhatsApp) {
          const waUrl = `https://wa.me/917281851011?text=${encodeURIComponent('OneWay Support Assistance for: ' + query)}`;
          waEscalateBtn = `
            <div style="margin-top: 10px;">
              <a href="${waUrl}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; background: #25d366; color: white; padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 800; text-decoration: none;">
                💬 Speak with Dispatch Captain on WhatsApp
              </a>
            </div>
          `;
        }

        botBubble.innerHTML = `
          <div class="ai-bot-name">OneWay AI Support</div>
          <div>${supportRes.answer.replace(/\n/g, '<br>')}</div>
          ${extraHtml}
          ${waEscalateBtn}
        `;
      } else {
        botBubble.innerHTML = `
          <div class="ai-bot-name">OneWay AI Support</div>
          <div>I am at your service. For instant trip confirmation, booking lookup, or outstation inquiries across Bihar, you can also connect 24x7 with our direct dispatch team at <strong>+91 80021 41816</strong> or WhatsApp <strong>+91 72818 51011</strong>.</div>
        `;
      }
      msgsArea.appendChild(botBubble);
    }
  } catch (err) {
    console.error("AI assistant error:", err);
    loadingBubble.remove();
    const errorBubble = document.createElement("div");
    errorBubble.className = "ai-bubble ai-bubble-bot";
    errorBubble.innerHTML = `
      <div class="ai-bot-name">OneWay AI Support</div>
      <div>Our AI intelligence system is currently operating in offline-cached mode. Feel free to use the instant booking search bar above or call our 24x7 helpdesk at <strong>+91 80021 41816</strong>.</div>
    `;
    msgsArea.appendChild(errorBubble);
  }

  msgsArea.scrollTop = msgsArea.scrollHeight;
};

window.applyAiParsedTrip = (intent) => {
  if (!window.bookingManager || !intent) return;

  const bm = window.bookingManager;

  // Resolve origin
  if (intent.origin && typeof OTB_CITIES !== "undefined") {
    const orig = OTB_CITIES.find(c => c.name.toLowerCase().includes(intent.origin.toLowerCase()) || intent.origin.toLowerCase().includes(c.name.toLowerCase()));
    if (orig) {
      bm.originCity = orig;
      const pInput = document.getElementById("input-pickup");
      if (pInput) pInput.value = `${orig.name}${orig.district && orig.district !== orig.name ? ', ' + orig.district : ''}, ${orig.state}`;
    }
  }

  // Resolve destination
  if (intent.destination && typeof OTB_CITIES !== "undefined") {
    const dest = OTB_CITIES.find(c => c.name.toLowerCase().includes(intent.destination.toLowerCase()) || intent.destination.toLowerCase().includes(c.name.toLowerCase()));
    if (dest) {
      bm.destCity = dest;
      const dInput = document.getElementById("input-drop");
      if (dInput) dInput.value = `${dest.name}${dest.district && dest.district !== dest.name ? ', ' + dest.district : ''}, ${dest.state}`;
    }
  }

  // Resolve date
  if (intent.pickupDate) {
    bm.pickupDate = intent.pickupDate;
    const pDateInput = document.getElementById("pickup-date-input");
    if (pDateInput) pDateInput.value = intent.pickupDate;
    const dispDate = document.getElementById("display-pickup-date");
    if (dispDate) dispDate.textContent = intent.pickupDate;
  }

  // Resolve time
  if (intent.pickupTime) {
    bm.pickupTime = intent.pickupTime;
    const dispTime = document.getElementById("display-pickup-time");
    if (dispTime) dispTime.textContent = intent.pickupTime;
  }

  // Resolve cab tier
  if (intent.recommendedTier) {
    bm.selectedCabId = intent.recommendedTier;
  }

  // Close AI widget
  window.toggleAiAssistant(false);

  // Scroll to booking form or check fares
  const heroCard = document.getElementById("booking-hero");
  if (heroCard) {
    heroCard.scrollIntoView({ behavior: "smooth" });
  }

  // If user phone exists, automatically calculate fare, otherwise prompt phone
  const storedPhone = localStorage.getItem("oneway_fare_phone") || (window.currentUser ? window.currentUser.phone : "");
  if (storedPhone && storedPhone.length >= 10) {
    const phoneInput = document.getElementById("input-fare-phone");
    if (phoneInput && !phoneInput.value) phoneInput.value = storedPhone.slice(-10);
    bm.handleCheckFare(false);
  } else {
    const phoneInput = document.getElementById("input-fare-phone");
    if (phoneInput) {
      phoneInput.focus();
      if (window.showToast) {
        window.showToast("Trip details loaded! Enter mobile number to unlock live fares", "info");
      }
    }
  }
};

/* ==========================================================================
   CUSTOMER LIVE NOTIFICATION & STATUS ENGINE (Web Notification & Audio API)
   ========================================================================== */
class CustomerNotificationManager {
  constructor() {
    this.isEnabled = localStorage.getItem("otb_customer_notifications") !== "false";
    this.audioEnabled = localStorage.getItem("otb_customer_audio") !== "false";
    this.knownStates = new Map();
    this.pollTimer = null;
    this.audioContext = null;
    this.hasInitialSync = false;

    this.init();
  }

  init() {
    // Start background check every 5 seconds
    this.startPolling();
  }

  playChime(type = "info") {
    if (!this.audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioContext) this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") this.audioContext.resume();

      const now = this.audioContext.currentTime;
      const freqs = type === "driver_assigned" ? [523.25, 659.25, 783.99] : [587.33, 880.00];
      freqs.forEach((freq, idx) => {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.001, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.36);
      });
    } catch (e) {
      console.warn("Customer chime error:", e);
    }
  }

  async requestPermission() {
    if (!("Notification" in window)) return;
    try {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        this.playChime("info");
        this.sendNotification(
          "OneWayTaxiBihar | Ride Notifications Enabled",
          "You will receive instant alerts on this device when your driver is assigned or arrives at your doorstep.",
          "cust_perm_granted"
        );
      }
    } catch (e) {
      console.warn("Customer notification permission error:", e);
    }
  }

  sendNotification(title, body, tag = "") {
    if (!("Notification" in window) || Notification.permission !== "granted" || !this.isEnabled) {
      return;
    }
    try {
      const notif = new Notification(title, {
        body: body,
        icon: "favicon.svg",
        badge: "favicon.svg",
        tag: tag || ("cust_" + Date.now()),
        vibrate: [250, 100, 250],
        requireInteraction: true
      });
      notif.onclick = function() {
        window.focus();
        if (window.openMyTripsModal) {
          window.openMyTripsModal();
        }
        notif.close();
      };
    } catch (err) {
      console.warn("Customer notification send error:", err);
    }
  }

  onBookingSubmitted(booking) {
    if ("Notification" in window && Notification.permission === "default") {
      setTimeout(() => this.requestPermission(), 1000);
    }
    if (booking && booking.bookingId) {
      this.knownStates.set(booking.bookingId, booking.bookingStatus || "REQUESTED");
    }
    this.pollStatus();
  }

  startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.pollStatus(), 5000);
    this.pollStatus();
  }

  async pollStatus() {
    try {
      const rides = await ApiClient.getRides();
      if (!Array.isArray(rides)) return;

      if (!this.hasInitialSync) {
        rides.forEach(r => this.knownStates.set(r.bookingId, r.bookingStatus));
        this.hasInitialSync = true;
        return;
      }

      rides.forEach(r => {
        const prevStatus = this.knownStates.get(r.bookingId);
        if (!prevStatus) {
          this.knownStates.set(r.bookingId, r.bookingStatus);
          return;
        }

        if (prevStatus !== r.bookingStatus) {
          this.knownStates.set(r.bookingId, r.bookingStatus);

          // Handle specific transitions
          if (r.bookingStatus === "DRIVER ASSIGNED" || r.bookingStatus === "CONFIRMED") {
            this.playChime("driver_assigned");
            const dName = r.driverName || "Commercial Chauffeur";
            const dVeh = r.driverVehicleNo || r.driverVehicle || "Assigned Vehicle";
            this.sendNotification(
              `Chauffeur Assigned • ${r.originCity} ➔ ${r.destCity}`,
              `Driver ${dName} (${dVeh}) is confirmed for your trip. Tap to view details.`,
              `cust_status_${r.bookingId}`
            );
            if (window.showToast) {
              window.showToast(`Chauffeur Assigned: ${dName} (${dVeh})`, "success");
            }
          } else if (r.bookingStatus === "DRIVER ON THE WAY" || r.bookingStatus === "ON THE WAY") {
            this.playChime("info");
            const dName = r.driverName || "Chauffeur";
            this.sendNotification(
              `Chauffeur On The Way • ${r.originCity}`,
              `${dName} has departed and is on the way to your pickup location.`,
              `cust_status_${r.bookingId}`
            );
            if (window.showToast) {
              window.showToast(`${dName} is on the way to pickup!`, "info");
            }
          } else if (r.bookingStatus === "ARRIVED") {
            this.playChime("driver_assigned");
            this.sendNotification(
              `Cab Arrived at Doorstep!`,
              `Your cab has arrived at ${r.pickupAddress || r.originCity}. Please board when ready.`,
              `cust_status_${r.bookingId}`
            );
            if (window.showToast) {
              window.showToast(`Cab arrived at your doorstep!`, "success");
            }
          } else if (r.bookingStatus === "TRIP STARTED") {
            this.playChime("info");
            this.sendNotification(
              `Trip Started • Have a Safe Journey`,
              `Journey to ${r.destCity} is now underway. SOS & tracking active.`,
              `cust_status_${r.bookingId}`
            );
          } else if (r.bookingStatus === "COMPLETED") {
            this.playChime("info");
            this.sendNotification(
              `Trip Completed • Thank You`,
              `You have arrived at ${r.destCity}. Download your invoice in My Trips.`,
              `cust_status_${r.bookingId}`
            );
          }

          // If My Trips modal is currently open, refresh it
          const tripsModal = document.getElementById("modal-my-trips");
          if (tripsModal && tripsModal.classList.contains("open") && window.openMyTripsModal) {
            window.openMyTripsModal();
          }
        }
      });
    } catch (e) {
      // Ignore network polling glitches
    }
  }
}

if (typeof window !== "undefined") {
  window.CustomerNotificationManager = CustomerNotificationManager;
  window.customerNotificationManager = new CustomerNotificationManager();
}





