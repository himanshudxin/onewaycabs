/**
 * OneWayTaxiBihar (onewaytaxibihar.com) - Booking Engine & Route Controller
 * Covers all 38 Districts of Bihar + Connecting Outstations, 4 Trip Types,
 * Dynamic All-Inclusive Fares, Passenger Checkout, and Ticket Confirmation.
 */

class BookingManager {
  constructor() {
    this.tripType = "oneway"; // "oneway" | "roundtrip" | "local" | "airport"
    this.originCity = null; // Blank initially - set by user
    this.destCity = null;   // Blank initially - set by user
    
    const today = new Date();
    const formatYMD = (d) => d.toISOString().split("T")[0];
    this.pickupDate = formatYMD(today); // Only current date is filled initially
    this.pickupTime = "10:00 AM";
    this.returnDate = "";
    this.localPackageId = "pkg_8hr_80km";
    this.flightNumber = "";

    this.selectedCabId = "sedan";
    this.calculatedDistanceKm = 104;
    this.calculatedDuration = "2h 15m";
    this.calculatedToll = 110;
    this.userPhone = "";
    this.currentWhatsAppLeadUrl = "";
    this.isFareUnlocked = false;

    this.passengerDetails = {
      name: "Passenger",
      phone: "+91",
      email: "",
      pickupAddress: "",
      dropAddress: "",
      luggageCount: "2-3 Large Bags",
      gstin: "",
      companyName: ""
    };

    this.activeBooking = null;
    this.paymentMethod = "Cash / UPI to Driver";
  }

  init() {
    this.setDefaultDates();
    this.setupAutocomplete();
    this.setupEventListeners();
    this.renderPopularRouteChips();
    this.renderFriendsHeroReviews();
    this.renderWhyChooseCards();
    this.renderTestimonials();
    this.renderMajorCities();
    this.renderFAQs();
    this.renderFooterRoutes();
    this.calculateAndRenderFares();
  }

  setDefaultDates() {
    const today = new Date();
    const formatYMD = (d) => d.toISOString().split("T")[0];
    this.pickupDate = formatYMD(today); // ONLY CURRENT DATE FILLED INITIALLY
    this.returnDate = "";

    const pickupDateInput = document.getElementById("pickup-date-input");
    const returnDateInput = document.getElementById("return-date-input");

    if (pickupDateInput) {
      pickupDateInput.value = this.pickupDate;
      pickupDateInput.min = formatYMD(today);
      pickupDateInput.addEventListener("change", (e) => {
        this.pickupDate = e.target.value;
      });
    }

    if (returnDateInput) {
      returnDateInput.value = this.returnDate;
      returnDateInput.min = formatYMD(today);
      returnDateInput.addEventListener("change", (e) => {
        this.returnDate = e.target.value;
      });
    }

    const timeSelect = document.getElementById("pickup-time-select");
    if (timeSelect) {
      timeSelect.addEventListener("change", (e) => {
        this.pickupTime = e.target.value;
      });
    }
  }

  /* ==========================================================================
     INTELLIGENT LOCATION RECOMMENDATIONS & AUTOCOMPLETE
     ========================================================================== */
  setupAutocomplete() {
    const pickupInput = document.getElementById("input-pickup");
    const dropInput = document.getElementById("input-drop");
    const pickupDropdown = document.getElementById("pickup-dropdown");
    const dropDropdown = document.getElementById("drop-dropdown");
    const clearPickupBtn = document.getElementById("btn-clear-pickup");
    const clearDropBtn = document.getElementById("btn-clear-drop");
    const swapBtn = document.getElementById("btn-swap-route");
    const gpsBtn = document.getElementById("btn-gps-pickup");
    const lblPickup = document.getElementById("lbl-pickup");
    const lblDrop = document.getElementById("lbl-drop");

    const setupInputEvents = (input, dropdown, type) => {
      if (!input || !dropdown) return;

      // Fast real-time keystroke filtering
      input.addEventListener("input", (e) => {
        this.handleCitySearch(type, e.target.value.trim(), dropdown, false);
      });

      // Instant dropdown opening on focus or click
      input.addEventListener("focus", () => {
        if (type === "pickup" && dropDropdown) dropDropdown.style.display = "none";
        if (type === "drop" && pickupDropdown) pickupDropdown.style.display = "none";
        this.handleCitySearch(type, input.value.trim(), dropdown, true);
      });

      input.addEventListener("click", () => {
        if (dropdown.style.display !== "block") {
          this.handleCitySearch(type, input.value.trim(), dropdown, true);
        }
      });

      // Keyboard navigation
      input.addEventListener("keydown", (e) => {
        const items = dropdown.querySelectorAll(".autocomplete-item");
        if (!items.length || dropdown.style.display === "none") return;

        let activeIdx = -1;
        items.forEach((it, idx) => {
          if (it.classList.contains("active-item")) activeIdx = idx;
        });

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextIdx = (activeIdx + 1) % items.length;
          items.forEach(it => it.classList.remove("active-item"));
          items[nextIdx].classList.add("active-item");
          items[nextIdx].scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevIdx = (activeIdx - 1 + items.length) % items.length;
          items.forEach(it => it.classList.remove("active-item"));
          items[prevIdx].classList.add("active-item");
          items[prevIdx].scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (activeIdx >= 0 && items[activeIdx]) {
            items[activeIdx].click();
          } else if (items.length > 0) {
            items[0].click();
          }
        } else if (e.key === "Escape") {
          dropdown.style.display = "none";
        }
      });
    };

    if (pickupInput && pickupDropdown) {
      setupInputEvents(pickupInput, pickupDropdown, "pickup");
    }

    if (dropInput && dropDropdown) {
      setupInputEvents(dropInput, dropDropdown, "drop");
    }

    if (lblPickup && pickupInput) {
      lblPickup.addEventListener("click", () => pickupInput.focus());
    }

    if (lblDrop && dropInput) {
      lblDrop.addEventListener("click", () => dropInput.focus());
    }

    if (clearPickupBtn && pickupInput) {
      clearPickupBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        pickupInput.value = "";
        this.originCity = null;
        this.clearGpsLocatingUI();
        pickupInput.focus();
        this.handleCitySearch("pickup", "", pickupDropdown, true);
        this.calculateAndRenderFares();
      });
    }

    if (clearDropBtn && dropInput) {
      clearDropBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropInput.value = "";
        this.destCity = null;
        dropInput.focus();
        this.handleCitySearch("drop", "", dropDropdown, true);
        this.calculateAndRenderFares();
      });
    }

    if (swapBtn) {
      swapBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this.originCity && !this.destCity) return;
        const temp = this.originCity;
        this.originCity = this.destCity;
        this.destCity = temp;

        const formatCityLabel = (c) => c ? `${c.name}${c.district && c.district !== c.name && c.type !== 'airport' ? ', ' + c.district : ''} (${c.hindiName || ''}), ${c.state}` : "";
        if (pickupInput) pickupInput.value = formatCityLabel(this.originCity);
        if (dropInput) dropInput.value = formatCityLabel(this.destCity);

        if (pickupDropdown) pickupDropdown.style.display = "none";
        if (dropDropdown) dropDropdown.style.display = "none";

        this.calculateAndRenderFares();
      });
    }

    if (gpsBtn) {
      gpsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.detectCurrentLocation(true);
      });
    }

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".autocomplete-wrapper")) {
        if (pickupDropdown) pickupDropdown.style.display = "none";
        if (dropDropdown) dropDropdown.style.display = "none";
      }
    });
  }

  /* ==========================================================================
     GPS AUTOMATIC CURRENT LOCATION FETCHER & DISTANCE CALCULATOR
     ========================================================================== */
  calcHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 100;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  findNearestDistrict(lat, lng) {
    let nearest = null;
    let minDistance = Infinity;
    for (const city of OTB_CITIES) {
      if (city.lat && city.lng) {
        const d = this.calcHaversineDistance(lat, lng, city.lat, city.lng);
        if (d < minDistance) {
          minDistance = d;
          nearest = city;
        }
      }
    }
    return nearest;
  }

  detectCurrentLocation(autoFocusDrop = true) {
    const pickupInput = document.getElementById("input-pickup");
    const pickupDropdown = document.getElementById("pickup-dropdown");
    const pickupGroup = document.getElementById("group-pickup");
    const gpsBtn = document.getElementById("btn-gps-pickup");

    if (pickupGroup) pickupGroup.classList.add("gps-active");
    if (gpsBtn) gpsBtn.classList.add("gps-searching");

    if (!navigator.geolocation) {
      this.clearGpsLocatingUI();
      window.showToast("Geolocation is not supported by your browser", "info");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const nearest = this.findNearestDistrict(lat, lng) || OTB_CITIES.find(c => c.id === "patna") || OTB_CITIES[0];
        this.originCity = nearest;

        if (pickupInput) {
          pickupInput.value = `${nearest.name} (${nearest.hindiName}), ${nearest.state}`;
        }
        if (pickupDropdown) pickupDropdown.style.display = "none";
        this.clearGpsLocatingUI();
        window.showToast(`Location detected: ${nearest.name} (${nearest.hindiName})`, "success");

        this.calculateAndRenderFares();

        if (autoFocusDrop) {
          setTimeout(() => {
            const dropInput = document.getElementById("input-drop");
            const dropDropdown = document.getElementById("drop-dropdown");
            if (dropInput && !dropInput.value.trim()) {
              dropInput.focus();
              this.handleCitySearch("drop", "", dropDropdown, true);
            }
          }, 200);
        }
      },
      (err) => {
        console.warn("GPS detection skipped or denied:", err.message);
        this.clearGpsLocatingUI();
        window.showToast("Location access unavailable. Please choose your city from the list.", "info");
        if (pickupInput && pickupDropdown) {
          pickupInput.focus();
          this.handleCitySearch("pickup", "", pickupDropdown, true);
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
    );
  }

  fetchCurrentLocationAndFillPickup(autoFocusDrop = true) {
    return this.detectCurrentLocation(autoFocusDrop);
  }

  clearGpsLocatingUI() {
    const pickupGroup = document.getElementById("group-pickup");
    const gpsBtn = document.getElementById("btn-gps-pickup");
    if (pickupGroup) pickupGroup.classList.remove("gps-active");
    if (gpsBtn) gpsBtn.classList.remove("gps-searching");
  }

  fallbackDefaultPickup(autoFocusDrop = true, message = "") {
    this.clearGpsLocatingUI();
    if (!this.originCity) {
      this.originCity = OTB_CITIES.find(c => c.id === "patna") || OTB_CITIES[0];
      const pickupInput = document.getElementById("input-pickup");
      if (pickupInput) pickupInput.value = `${this.originCity.name} (${this.originCity.hindiName}), ${this.originCity.state}`;
    }
    if (message) window.showToast(message, "info");
    this.calculateAndRenderFares();

    if (autoFocusDrop) {
      setTimeout(() => {
        const dropInput = document.getElementById("input-drop");
        const dropDropdown = document.getElementById("drop-dropdown");
        if (dropInput) {
          dropInput.focus();
          this.handleCitySearch("drop", "", dropDropdown, true);
        }
      }, 200);
    }
  }

  /* ==========================================================================
     FAST, ACCURATE & PROFESSIONAL DROP & PICKUP RECOMMENDATION ENGINE
     ========================================================================== */
  handleCitySearch(type, query, dropdownEl, isFocus = false) {
    if (!dropdownEl) return;
    const lower = (query || "").trim().toLowerCase();

    // Clean vector SVG icon helper by location type (Zero emojis)
    const getCleanIconSvg = (c) => {
      if (c.type === "airport") {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.8-.2-1.5.1-1.8.7l-.5.9c-.3.7 0 1.5.6 1.9l6.5 4.7-3.5 3.5-2.8-.9c-.4-.1-.8 0-1.1.3l-.4.4c-.3.3-.3.8 0 1.1l2.3 2.3c.3.3.8.3 1.1 0l.4-.4c.3-.3.4-.7.3-1.1l-.9-2.8 3.5-3.5 4.7 6.5c.4.6 1.2.9 1.9.6l.9-.5c.6-.3.9-1 .7-1.8z"/></svg>`;
      }
      if (c.type === "railway") {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/><path d="M6 19l-2 3"/><path d="M18 19l2 3"/></svg>`;
      }
      if (c.type === "outstation") {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`;
      }
      if (c.type === "subdivision" || c.type === "town") {
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;
      }
      // Default: Official District Seat
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h1M9 13h1M9 17h1M15 13h1M15 17h1"/></svg>`;
    };

    // Category Type Badge Helper
    const getTypeBadge = (c) => {
      const label = c.typeLabel || (c.type === "subdivision" ? "Sub-Division" : (c.type === "district" ? "District HQ" : c.state));
      let cls = "badge-district";
      if (c.type === "airport") cls = "badge-airport";
      else if (c.type === "railway") cls = "badge-railway";
      else if (c.type === "subdivision") cls = "badge-subdivision";
      else if (c.type === "town") cls = "badge-town";
      else if (c.type === "outstation") cls = "badge-outstation";
      return `<span class="autocomplete-type-pill ${cls}">${label}</span>`;
    };

    // Keyword Match Highlighting (Clean, non-childish sapphire styling)
    const highlightMatchedWords = (text, searchWords) => {
      if (!text || !searchWords || !searchWords.length) return text || "";
      let output = text;
      const sorted = [...searchWords].sort((a, b) => b.length - a.length);
      sorted.forEach(w => {
        if (!w || w.length < 2) return;
        const reg = new RegExp(`(${w.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, "gi");
        output = output.replace(reg, `<strong class="ac-match-highlight">$1</strong>`);
      });
      return output;
    };

    // Route distance & duration calculator
    const getRouteMeta = (dest) => {
      if (!this.originCity || !dest) return { dist: null, duration: null };
      if (this.originCity.id === dest.id) return { dist: 25, duration: "45 min" };

      const popular = OTB_POPULAR_ROUTES.find(r =>
        (r.fromId === this.originCity.id && r.toId === dest.id) ||
        (r.fromId === dest.id && r.toId === this.originCity.id)
      );
      if (popular) {
        return { dist: popular.distanceKm, duration: popular.duration };
      }

      if (this.originCity.lat && dest.lat) {
        const d = this.calcHaversineDistance(this.originCity.lat, this.originCity.lng, dest.lat, dest.lng);
        const hours = (d / 48).toFixed(1);
        return { dist: d, duration: `~${hours}h` };
      }
      return { dist: null, duration: null };
    };

    // CASE 1: Real-time search with Multi-Word Keyword Matching & Non-Match Elimination
    if (lower.length > 0) {
      const searchWords = lower.split(/[\s,]+/).filter(w => w.length > 0);
      const scoredMatches = [];

      for (const c of OTB_CITIES) {
        let matchesAllWords = true;
        let score = 0;

        const cName = (c.name || "").toLowerCase();
        const cHindi = c.hindiName || "";
        const cDistrict = (c.district || "").toLowerCase();
        const cDivision = (c.division || "").toLowerCase();
        const cTag = (c.tag || "").toLowerCase();
        const cTypeLabel = (c.typeLabel || "").toLowerCase();
        const cAirport = (c.airport || "").toLowerCase();
        const cKeywords = Array.isArray(c.keywords) ? c.keywords.join(" ").toLowerCase() : "";

        for (const w of searchWords) {
          let wordMatched = false;

          // 1. Direct Name Match (Highest priority)
          if (cName === w) {
            wordMatched = true;
            score += 250;
          } else if (cName.startsWith(w)) {
            wordMatched = true;
            score += 180;
          } else if (cName.includes(" " + w) || cName.includes("(" + w) || cName.includes("/" + w)) {
            wordMatched = true;
            score += 140;
          } else if (cName.includes(w)) {
            wordMatched = true;
            score += 90;
          }

          // 2. Hindi Name Match
          if (cHindi.includes(w)) {
            wordMatched = true;
            score += 120;
          }

          // 3. Parent District Match (e.g. typing "patna" finds Danapur, Bihta, Barh)
          if (cDistrict === w) {
            wordMatched = true;
            score += 100;
          } else if (cDistrict.startsWith(w)) {
            wordMatched = true;
            score += 70;
          } else if (cDistrict.includes(w)) {
            wordMatched = true;
            score += 45;
          }

          // 4. Airport / Station code or label match
          if (cAirport && cAirport.includes(w)) {
            wordMatched = true;
            score += 110;
          }

          // 5. Keyword or Landmark Tag match
          if (cKeywords.includes(w) || cTag.includes(w) || cTypeLabel.includes(w)) {
            wordMatched = true;
            score += 65;
          }

          // 6. Division match (Only if query is longer than 2 letters)
          if (w.length > 2 && (cDivision.startsWith(w) || cDivision.includes(w))) {
            wordMatched = true;
            score += 30;
          }

          // STRICT ELIMINATION: If any search word doesn't match this candidate, eliminate it!
          if (!wordMatched) {
            matchesAllWords = false;
            break;
          }
        }

        if (matchesAllWords) {
          // Bonus scoring for relevant exact and popular matches
          if (cName === lower) score += 300;
          else if (cName.startsWith(lower)) score += 150;
          if (c.popular) score += 40;
          if (c.type === "district") score += 35;
          if (c.type === "airport" && (lower.includes("air") || lower.includes("port") || lower.includes("fly"))) score += 120;
          if (c.type === "railway" && (lower.includes("junc") || lower.includes("station") || lower.includes("rail"))) score += 120;

          scoredMatches.push({ item: c, score });
        }
      }

      // Sort by relevance score descending
      scoredMatches.sort((a, b) => b.score - a.score);
      const matches = scoredMatches.map(s => s.item);

      if (matches.length === 0) {
        dropdownEl.innerHTML = `
          <div class="autocomplete-no-match">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="margin: 0 auto 8px; color: var(--owc-text-muted);"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <div class="no-match-title">No location matching "${query}"</div>
            <div class="no-match-sub">Try entering a District (e.g. Patna, Gaya, Muzaffarpur) or Sub-Division (e.g. Danapur, Bihta, Rajgir, Sasaram, Hajipur, Raxaul)</div>
          </div>
        `;
        dropdownEl.style.display = "block";
        return;
      }

      dropdownEl.innerHTML = `
        <div class="autocomplete-group-header">
          <span>MATCHING LOCATIONS (${matches.length})</span>
          <span style="font-size: 10px; opacity: 0.8;">Use ↑ ↓ keys to navigate</span>
        </div>
        ${matches.slice(0, 15).map((c, idx) => {
          const meta = type === "drop" ? getRouteMeta(c) : { dist: null, duration: null };
          const districtLine = c.district && c.district !== c.name 
            ? `${c.typeLabel || 'Sub-Division'} • ${c.district} District`
            : `${c.typeLabel || 'District HQ'} • ${c.division} Division`;
          return `
            <div class="autocomplete-item ${idx === 0 ? 'active-item' : ''}" onclick="window.bookingManager.selectCity('${type}', '${c.id}')">
              <div class="autocomplete-item-left">
                <div class="autocomplete-item-icon ${c.type}">
                  ${getCleanIconSvg(c)}
                </div>
                <div class="autocomplete-item-meta">
                  <div class="autocomplete-item-name">
                    ${highlightMatchedWords(c.name, searchWords)} 
                    ${c.hindiName ? `<span class="ac-item-hindi">(${c.hindiName})</span>` : ''}
                  </div>
                  <div class="autocomplete-item-state">
                    ${districtLine}
                    ${c.tag ? ` &bull; <span class="ac-item-tag-text">${c.tag}</span>` : ''}
                  </div>
                </div>
              </div>
              <div class="autocomplete-item-right">
                ${getTypeBadge(c)}
                ${meta.dist ? `<span class="autocomplete-dist-badge">~${meta.dist} KM</span>` : ''}
                ${meta.duration ? `<span class="autocomplete-duration-text">${meta.duration}</span>` : ''}
              </div>
            </div>
          `;
        }).join("")}
      `;
      dropdownEl.style.display = "block";
      return;
    }

    // CASE 2: Pickup Dropdown on Focus (Initial Empty State)
    if (type === "pickup") {
      const popularDistricts = OTB_CITIES.filter(c => c.type === "district" && c.popular).slice(0, 7);
      const airports = OTB_CITIES.filter(c => c.type === "airport").slice(0, 3);
      const keySubdivisions = OTB_CITIES.filter(c => c.type === "subdivision" && c.popular).slice(0, 6);

      dropdownEl.innerHTML = `
        <div class="autocomplete-item current-loc-item" onclick="window.bookingManager.detectCurrentLocation(true)">
          <div class="autocomplete-item-left">
            <div class="autocomplete-item-icon icon-gps">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
                <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <div class="autocomplete-item-name" style="color: #0070f3; font-weight: 800;">Use Current GPS Location</div>
              <div class="autocomplete-item-state">Detect exact doorstep position in Bihar</div>
            </div>
          </div>
          <span class="autocomplete-dist-badge" style="background: rgba(0, 112, 243, 0.1); color: #0070f3;">GPS AUTO</span>
        </div>

        <div class="autocomplete-group-header">
          <span>POPULAR DISTRICT HEADQUARTERS</span>
        </div>
        ${popularDistricts.map(c => `
          <div class="autocomplete-item" onclick="window.bookingManager.selectCity('pickup', '${c.id}')">
            <div class="autocomplete-item-left">
              <div class="autocomplete-item-icon district">
                ${getCleanIconSvg(c)}
              </div>
              <div class="autocomplete-item-meta">
                <div class="autocomplete-item-name">${c.name} <span class="ac-item-hindi">(${c.hindiName})</span></div>
                <div class="autocomplete-item-state">${c.division} Division • ${c.tag || 'Bihar'}</div>
              </div>
            </div>
            <div class="autocomplete-item-right">
              ${getTypeBadge(c)}
            </div>
          </div>
        `).join("")}

        <div class="autocomplete-group-header" style="border-top: 1px solid var(--owc-border-light);">
          <span>COMMERCIAL AIRPORT TERMINALS</span>
        </div>
        ${airports.map(c => `
          <div class="autocomplete-item" onclick="window.bookingManager.selectCity('pickup', '${c.id}')">
            <div class="autocomplete-item-left">
              <div class="autocomplete-item-icon airport">
                ${getCleanIconSvg(c)}
              </div>
              <div class="autocomplete-item-meta">
                <div class="autocomplete-item-name">${c.name}</div>
                <div class="autocomplete-item-state">${c.tag}</div>
              </div>
            </div>
            <div class="autocomplete-item-right">
              ${getTypeBadge(c)}
            </div>
          </div>
        `).join("")}

        <div class="autocomplete-group-header" style="border-top: 1px solid var(--owc-border-light);">
          <span>KEY SUB-DIVISIONS & TEHSILS</span>
        </div>
        ${keySubdivisions.map(c => `
          <div class="autocomplete-item" onclick="window.bookingManager.selectCity('pickup', '${c.id}')">
            <div class="autocomplete-item-left">
              <div class="autocomplete-item-icon subdivision">
                ${getCleanIconSvg(c)}
              </div>
              <div class="autocomplete-item-meta">
                <div class="autocomplete-item-name">${c.name} <span class="ac-item-hindi">(${c.hindiName})</span></div>
                <div class="autocomplete-item-state">${c.district} District &bull; ${c.tag}</div>
              </div>
            </div>
            <div class="autocomplete-item-right">
              ${getTypeBadge(c)}
            </div>
          </div>
        `).join("")}
      `;
      dropdownEl.style.display = "block";
      return;
    }

    // CASE 3: Drop Dropdown on Focus (Initial Empty State)
    const originId = this.originCity ? this.originCity.id : "patna";
    const originName = this.originCity ? this.originCity.name : "Patna";

    let popularDests = [];
    const knownRoutes = OTB_POPULAR_ROUTES.filter(r => r.fromId === originId || r.toId === originId);
    if (knownRoutes.length > 0) {
      popularDests = knownRoutes.map(r => {
        const targetId = r.fromId === originId ? r.toId : r.fromId;
        return OTB_CITIES.find(c => c.id === targetId);
      }).filter(Boolean);
    }
    const fallbackHubs = OTB_CITIES.filter(c => c.popular && c.id !== originId && !popularDests.some(p => p.id === c.id));
    const topDests = [...popularDests, ...fallbackHubs].slice(0, 6);
    const airports = OTB_CITIES.filter(c => c.type === "airport" && c.id !== originId).slice(0, 3);
    const subDivisions = OTB_CITIES.filter(c => c.type === "subdivision" && c.popular && c.id !== originId).slice(0, 4);
    const outstations = OTB_CITIES.filter(c => c.type === "outstation" && c.id !== originId).slice(0, 4);

    dropdownEl.innerHTML = `
      <div class="autocomplete-group-header">
        <span>RECOMMENDED DESTINATIONS FROM ${originName.toUpperCase()}</span>
      </div>
      ${topDests.map(c => {
        const meta = getRouteMeta(c);
        return `
          <div class="autocomplete-item" onclick="window.bookingManager.selectCity('drop', '${c.id}')">
            <div class="autocomplete-item-left">
              <div class="autocomplete-item-icon ${c.type}">
                ${getCleanIconSvg(c)}
              </div>
              <div class="autocomplete-item-meta">
                <div class="autocomplete-item-name">${c.name} <span class="ac-item-hindi">(${c.hindiName})</span></div>
                <div class="autocomplete-item-state">${c.district ? c.district + ' District' : c.division + ' Division'} • ${c.tag || 'Major City'}</div>
              </div>
            </div>
            <div class="autocomplete-item-right">
              ${getTypeBadge(c)}
              ${meta.dist ? `<span class="autocomplete-dist-badge">~${meta.dist} KM</span>` : ''}
              ${meta.duration ? `<span class="autocomplete-duration-text">${meta.duration}</span>` : ''}
            </div>
          </div>
        `;
      }).join("")}

      <div class="autocomplete-group-header" style="border-top: 1px solid var(--owc-border-light);">
        <span>POPULAR SUB-DIVISIONS & TOWNS</span>
      </div>
      ${subDivisions.map(c => {
        const meta = getRouteMeta(c);
        return `
          <div class="autocomplete-item" onclick="window.bookingManager.selectCity('drop', '${c.id}')">
            <div class="autocomplete-item-left">
              <div class="autocomplete-item-icon subdivision">
                ${getCleanIconSvg(c)}
              </div>
              <div class="autocomplete-item-meta">
                <div class="autocomplete-item-name">${c.name} <span class="ac-item-hindi">(${c.hindiName})</span></div>
                <div class="autocomplete-item-state">${c.district} District • ${c.tag}</div>
              </div>
            </div>
            <div class="autocomplete-item-right">
              ${getTypeBadge(c)}
              ${meta.dist ? `<span class="autocomplete-dist-badge">~${meta.dist} KM</span>` : ''}
              ${meta.duration ? `<span class="autocomplete-duration-text">${meta.duration}</span>` : ''}
            </div>
          </div>
        `;
      }).join("")}

      <div class="autocomplete-group-header" style="border-top: 1px solid var(--owc-border-light);">
        <span>AIRPORTS & FLIGHT TERMINALS</span>
      </div>
      ${airports.map(c => {
        const meta = getRouteMeta(c);
        return `
          <div class="autocomplete-item" onclick="window.bookingManager.selectCity('drop', '${c.id}')">
            <div class="autocomplete-item-left">
              <div class="autocomplete-item-icon airport">
                ${getCleanIconSvg(c)}
              </div>
              <div class="autocomplete-item-meta">
                <div class="autocomplete-item-name">${c.name}</div>
                <div class="autocomplete-item-state">${c.district} District • 24x7 Airport Drop</div>
              </div>
            </div>
            <div class="autocomplete-item-right">
              ${getTypeBadge(c)}
              ${meta.dist ? `<span class="autocomplete-dist-badge">~${meta.dist} KM</span>` : ''}
              ${meta.duration ? `<span class="autocomplete-duration-text">${meta.duration}</span>` : ''}
            </div>
          </div>
        `;
      }).join("")}

      <div class="autocomplete-group-header" style="border-top: 1px solid var(--owc-border-light);">
        <span>OUTSTATION & INTERCITY CORRIDORS</span>
      </div>
      ${outstations.map(c => {
        const meta = getRouteMeta(c);
        return `
          <div class="autocomplete-item" onclick="window.bookingManager.selectCity('drop', '${c.id}')">
            <div class="autocomplete-item-left">
              <div class="autocomplete-item-icon outstation">
                ${getCleanIconSvg(c)}
              </div>
              <div class="autocomplete-item-meta">
                <div class="autocomplete-item-name">${c.name} <span class="ac-item-hindi">(${c.hindiName})</span></div>
                <div class="autocomplete-item-state">${c.state} • ${c.tag || 'Intercity Express'}</div>
              </div>
            </div>
            <div class="autocomplete-item-right">
              ${getTypeBadge(c)}
              ${meta.dist ? `<span class="autocomplete-dist-badge">~${meta.dist} KM</span>` : ''}
              ${meta.duration ? `<span class="autocomplete-duration-text">${meta.duration}</span>` : ''}
            </div>
          </div>
        `;
      }).join("")}
    `;

    dropdownEl.style.display = "block";
  }

  selectCity(type, cityId) {
    const city = OTB_CITIES.find(c => c.id === cityId);
    if (!city) return;

    const formattedName = `${city.name}${city.district && city.district !== city.name && city.type !== 'airport' ? ', ' + city.district : ''} (${city.hindiName || ''}), ${city.state}`;

    if (type === "pickup") {
      this.originCity = city;
      const input = document.getElementById("input-pickup");
      if (input) input.value = formattedName;
      const dd = document.getElementById("pickup-dropdown");
      if (dd) dd.style.display = "none";
      this.clearGpsLocatingUI();

      // Smoothly transition to Drop if drop is currently empty
      const dropInput = document.getElementById("input-drop");
      if (dropInput && !dropInput.value.trim()) {
        setTimeout(() => {
          dropInput.focus();
          const dropDropdown = document.getElementById("drop-dropdown");
          this.handleCitySearch("drop", "", dropDropdown, true);
        }, 150);
      }
    } else {
      this.destCity = city;
      const input = document.getElementById("input-drop");
      if (input) input.value = formattedName;
      const dd = document.getElementById("drop-dropdown");
      if (dd) dd.style.display = "none";

      const phoneInput = document.getElementById("input-fare-phone");
      if (phoneInput && !phoneInput.value.trim()) {
        setTimeout(() => {
          phoneInput.focus();
        }, 200);
      }
    }

    if (this.originCity && this.destCity && this.isFareUnlocked) {
      this.calculateAndRenderFares();
    } else {
      this.updateCheckFareButtonState();
    }
  }

  /* ==========================================================================
     EVENT LISTENERS & TAB CONTROLLERS
     ========================================================================== */
  setupEventListeners() {
    const tabBtns = document.querySelectorAll(".trip-tab-btn");
    tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.tripType = btn.getAttribute("data-trip");
        this.updateTripTypeUI();
        this.calculateAndRenderFares();
      });
    });

    const localPkgSelect = document.getElementById("local-package-select");
    if (localPkgSelect) {
      localPkgSelect.addEventListener("change", (e) => {
        this.localPackageId = e.target.value;
        this.calculateAndRenderFares();
      });
    }



    // Phone Input for Fare Verification & Direct Helpdesk Transfer (Live Validation & Clear)
    const phoneInput = document.getElementById("input-fare-phone");
    const phoneGroup = document.getElementById("phone-check-group");
    const phoneClearBtn = document.getElementById("phone-input-clear-btn");
    if (phoneInput) {
      const handlePhoneInput = () => {
        const val = phoneInput.value.replace(/\D/g, "");
        phoneInput.value = val;
        if (phoneGroup) {
          phoneGroup.classList.toggle("has-value", val.length > 0);
          const isValid = val.length === 10 && /^[6-9]\d{9}$/.test(val);
          phoneGroup.classList.toggle("is-valid", isValid);
          phoneGroup.style.borderColor = "";
          phoneGroup.style.boxShadow = "";
        }
        this.updateCheckFareButtonState();
      };

      phoneInput.addEventListener("input", handlePhoneInput);

      if (phoneClearBtn) {
        phoneClearBtn.addEventListener("click", () => {
          phoneInput.value = "";
          handlePhoneInput();
          phoneInput.focus();
        });
      }

      phoneInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleCheckFare();
        }
      });
    }

    const checkFareBtn = document.getElementById("btn-check-fare");
    if (checkFareBtn) {
      checkFareBtn.addEventListener("click", () => {
        this.handleCheckFare();
      });
    }

    this.updateCheckFareButtonState();
  }

  updateCheckFareButtonState() {
    const btn = document.getElementById("btn-check-fare");
    if (!btn) return;

    const pickupInput = document.getElementById("input-pickup");
    const dropInput = document.getElementById("input-drop");
    const phoneInput = document.getElementById("input-fare-phone");

    const hasPickup = Boolean(this.originCity || (pickupInput && pickupInput.value.trim().length > 2));
    const hasDrop = Boolean(this.destCity || (dropInput && dropInput.value.trim().length > 2));
    const phoneVal = phoneInput ? phoneInput.value.replace(/\D/g, "") : (this.userPhone || "");
    const hasValidPhone = phoneVal.length === 10 && /^[6-9]\d{9}$/.test(phoneVal);

    // Ready to execute when both locations are chosen AND valid 10-digit mobile number is entered
    const isReady = hasPickup && hasDrop && hasValidPhone;

    if (isReady) {
      btn.classList.add("ready");
      btn.setAttribute("title", "Calculate fares & connect with Patna Helpdesk");
      btn.innerHTML = `
        <span>Check Fares &amp; Availability</span>
        <svg class="btn-check-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    } else {
      btn.classList.remove("ready");
      btn.setAttribute("title", "Enter pickup, drop and mobile number to calculate fare");
      btn.innerHTML = `
        <span>Check Fares &amp; Availability</span>
        <svg class="btn-check-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      `;
    }
  }

  handleCheckFare(silent = false) {
    const pickupInput = document.getElementById("input-pickup");
    const dropInput = document.getElementById("input-drop");
    const phoneInput = document.getElementById("input-fare-phone");
    const phoneGroup = document.getElementById("phone-check-group");

    // 1. Resolve & Validate Pickup Location
    if (!this.originCity && pickupInput && pickupInput.value.trim()) {
      const q = pickupInput.value.trim().toLowerCase();
      this.originCity = OTB_CITIES.find(c =>
        q.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(q) ||
        (c.hindiName && (q.includes(c.hindiName) || c.hindiName.includes(q)))
      ) || null;
    }
    if (!this.originCity) {
      if (pickupInput) {
        const parent = pickupInput.closest(".input-field-group");
        if (parent) {
          parent.classList.add("shake-error");
          setTimeout(() => parent.classList.remove("shake-error"), 500);
        }
        pickupInput.focus();
      }
      if (!silent) window.showToast("Please enter or select a Pickup District/City", "warning");
      return false;
    }

    // 2. Resolve & Validate Drop Location
    if (!this.destCity && dropInput && dropInput.value.trim()) {
      const q = dropInput.value.trim().toLowerCase();
      this.destCity = OTB_CITIES.find(c =>
        q.includes(c.name.toLowerCase()) ||
        c.name.toLowerCase().includes(q) ||
        (c.hindiName && (q.includes(c.hindiName) || c.hindiName.includes(q)))
      ) || null;
    }
    if (!this.destCity) {
      if (dropInput) {
        const parent = dropInput.closest(".input-field-group");
        if (parent) {
          parent.classList.add("shake-error");
          setTimeout(() => parent.classList.remove("shake-error"), 500);
        }
        dropInput.focus();
      }
      if (!silent) window.showToast("Please enter or select a Drop District/City", "warning");
      return false;
    }

    // 3. Validate Mobile Number
    const rawVal = phoneInput ? phoneInput.value.trim().replace(/\D/g, "") : this.userPhone;
    if (!rawVal || rawVal.length !== 10 || !/^[6-9]\d{9}$/.test(rawVal)) {
      if (phoneGroup) {
        phoneGroup.style.borderColor = "#ef4444";
        phoneGroup.style.boxShadow = "0 0 0 4px rgba(239, 68, 68, 0.25)";
        phoneGroup.classList.add("shake-error");
        setTimeout(() => phoneGroup.classList.remove("shake-error"), 500);
      }
      if (phoneInput) {
        phoneInput.focus();
      }
      if (!silent) {
        window.showToast("Please enter a valid 10-digit mobile number", "warning");
      }
      return false;
    }

    if (phoneGroup) {
      phoneGroup.style.borderColor = "var(--owc-primary)";
      phoneGroup.style.boxShadow = "none";
    }

    this.userPhone = rawVal;
    this.passengerDetails.phone = `+91 ${rawVal}`;

    // 4. Open and reveal Fare Details Section & Map Section based on entered Pickup & Drop
    this.isFareUnlocked = true;
    const section = document.getElementById("cab-selection-section");
    const mapSection = document.getElementById("route-map-section");

    if (section) {
      section.classList.remove("fare-section-closed");
      section.classList.add("fare-section-open");
    }
    if (mapSection) {
      mapSection.classList.remove("fare-section-closed");
      mapSection.classList.add("fare-section-open");
    }

    this.calculateAndRenderFares();
    this.transferLeadToHelpdesk(rawVal, silent);

    if (window.onewayMap && window.onewayMap.map) {
      setTimeout(() => {
        window.onewayMap.map.invalidateSize();
      }, 250);
    }

    if (section && !silent) {
      setTimeout(() => {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      window.showToast(`Outstation Fares Calculated: ${this.originCity.name} to ${this.destCity.name}`, "success");
    }

    return true;
  }

  resetBookingForm() {
    this.originCity = null;
    this.destCity = null;
    this.userPhone = "";

    const pickupInput = document.getElementById("input-pickup");
    const dropInput = document.getElementById("input-drop");
    const phoneInput = document.getElementById("input-fare-phone");
    const pickupDropdown = document.getElementById("pickup-dropdown");
    const dropDropdown = document.getElementById("drop-dropdown");
    const phoneGroup = document.getElementById("phone-check-group");

    if (pickupInput) pickupInput.value = "";
    if (dropInput) dropInput.value = "";
    if (phoneInput) {
      phoneInput.value = "";
      phoneInput.blur();
    }
    if (pickupDropdown) pickupDropdown.style.display = "none";
    if (dropDropdown) dropDropdown.style.display = "none";
    if (phoneGroup) {
      phoneGroup.classList.remove("has-value", "is-valid");
      phoneGroup.style.borderColor = "";
      phoneGroup.style.boxShadow = "";
    }
    this.updateCheckFareButtonState();

    // Reset date to today's current date only
    const today = new Date();
    const formatYMD = (d) => d.toISOString().split("T")[0];
    this.pickupDate = formatYMD(today);
    const pickupDateInput = document.getElementById("pickup-date-input");
    if (pickupDateInput) pickupDateInput.value = this.pickupDate;

    localStorage.removeItem("oneway_fare_phone");
  }

  async transferLeadToHelpdesk(phone, silent = false) {
    const helpdeskNumber = "917281851011"; // 24x7 WhatsApp Dispatch: 7281851011
    const pFormat = `+91 ${phone}`;

    const origName = this.originCity ? this.originCity.name : "Patna";
    const destName = this.destCity ? this.destCity.name : "Gaya";

    // Calculate rates for quick quote preview
    const hatchFleet = OTB_FLEET.find(f => f.id === "hatchback") || OTB_FLEET[0];
    const sedanFleet = OTB_FLEET.find(f => f.id === "sedan") || OTB_FLEET[1];
    const suvFleet = OTB_FLEET.find(f => f.id === "suv") || OTB_FLEET[3];

    let hatchPrice = Math.round(this.calculatedDistanceKm * hatchFleet.ratePerKm);
    hatchPrice = Math.max(hatchPrice, 1698);
    let sedanPrice = Math.round(this.calculatedDistanceKm * sedanFleet.ratePerKm);
    sedanPrice = Math.max(sedanPrice, 2198);
    let suvPrice = Math.round(this.calculatedDistanceKm * suvFleet.ratePerKm);
    suvPrice = Math.max(suvPrice, 3398);

    const leadData = {
      phone: pFormat,
      rawPhone: phone,
      originCity: origName,
      destCity: destName,
      tripType: this.tripType,
      pickupDate: this.pickupDate,
      pickupTime: this.pickupTime,
      distanceKm: this.calculatedDistanceKm,
      duration: this.calculatedDuration,
      estFareHatch: hatchPrice,
      estFareSedan: sedanPrice,
      estFareSuv: suvPrice,
      source: "Fare Check Button",
      helpdeskWhatsApp: `+${helpdeskNumber}`,
      createdAt: new Date().toISOString()
    };

    // 1. Dispatch lead to server API
    try {
      if (window.ApiClient && ApiClient.sendLead) {
        await ApiClient.sendLead(leadData);
      }
    } catch (err) {
      console.warn("Lead recorded locally", err);
    }

    // 2. Prepare Helpdesk WhatsApp inquiry text
    const waText = 
      `*New Fare Inquiry - OneWayTaxiBihar*\n\n` +
      `*Customer Mobile:* ${pFormat}\n` +
      `*Route:* ${origName} → ${destName} (${this.tripType.toUpperCase()})\n` +
      `*Date & Time:* ${this.pickupDate} at ${this.pickupTime}\n` +
      `*Distance:* ${this.calculatedDistanceKm} KM (~${this.calculatedDuration})\n` +
      `*Estimated Rates (Toll & GST incl.):*\n` +
      `  • Hatchback: ₹${hatchPrice.toLocaleString('en-IN')}\n` +
      `  • Prime Sedan: ₹${sedanPrice.toLocaleString('en-IN')}\n` +
      `  • Family SUV: ₹${suvPrice.toLocaleString('en-IN')}\n\n` +
      `Please confirm available cab & connect with customer.`;

    const waUrl = `https://wa.me/${helpdeskNumber}?text=${encodeURIComponent(waText)}`;
    this.currentWhatsAppLeadUrl = waUrl;

    // 3. Update Route Bar with connection status
    this.updateRouteBarHelpdeskConnect(pFormat, waUrl);

    // 4. Notify user & launch WhatsApp
    if (!silent) {
      window.showToast(`Enquiry submitted! Transferred to Helpdesk WhatsApp (+91 72818 51011).`, "success");
      // Open WhatsApp chat directly in new window
      window.open(waUrl, "_blank");
    }
  }

  updateRouteBarHelpdeskConnect(phone, waUrl) {
    const bar = document.getElementById("route-fare-bar");
    if (!bar) return;

    let leadBadge = document.getElementById("rf-lead-badge");
    if (!leadBadge) {
      leadBadge = document.createElement("div");
      leadBadge.id = "rf-lead-badge";
      leadBadge.style.cssText = "display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; width: 100%; margin-top: 12px; padding-top: 10px; border-top: 1px dashed var(--owc-border); font-size: 13px;";
      bar.appendChild(leadBadge);
    }

    leadBadge.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; color: var(--owc-text);">
        <span style="background: #009af4; color: white; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        <span>Mobile: <strong style="color: var(--owc-primary);">${phone}</strong> (Connected to Patna Helpdesk)</span>
      </div>
      <a href="${waUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--owc-primary); font-weight: 700; text-decoration: none; font-size: 12.5px;">
        Open WhatsApp Chat →
      </a>
    `;
  }

  updateTripTypeUI() {
    const returnDateRow = document.getElementById("return-date-row");
    const localPkgRow = document.getElementById("local-pkg-row");
    const airportRow = document.getElementById("airport-details-row");
    const dropWrapper = document.getElementById("input-drop")?.closest(".autocomplete-wrapper");
    const swapBtn = document.getElementById("btn-swap-route");
    const lblDrop = document.getElementById("lbl-drop");

    if (returnDateRow) returnDateRow.style.display = this.tripType === "roundtrip" ? "block" : "none";
    if (localPkgRow) localPkgRow.style.display = this.tripType === "local" ? "block" : "none";
    if (airportRow) airportRow.style.display = this.tripType === "airport" ? "block" : "none";

    if (this.tripType === "local") {
      if (dropWrapper) dropWrapper.style.display = "none";
      if (swapBtn) swapBtn.style.display = "none";
    } else {
      if (dropWrapper) dropWrapper.style.display = "block";
      if (swapBtn) swapBtn.style.display = "flex";
      if (lblDrop) {
        lblDrop.textContent = this.tripType === "airport" ? "AIRPORT TERMINAL / DROP" : "DROP DISTRICT / CITY";
      }
    }
  }

  /* ==========================================================================
     DYNAMIC ROUTE & FARE CALCULATION MATRIX
     ========================================================================== */
  calculateAndRenderFares() {
    if (!this.originCity || !this.destCity) {
      this.calculatedDistanceKm = 100;
      this.calculatedDuration = "2h 00m";
      this.calculatedToll = 100;

      const displayRoute = document.getElementById("rf-display-route");
      const distBadge = document.getElementById("rf-dist-badge");
      const timeBadge = document.getElementById("rf-time-badge");
      const tollBadge = document.getElementById("rf-toll-badge");

      if (displayRoute) {
        if (this.originCity && !this.destCity) {
          displayRoute.innerHTML = `<span>Pickup: <strong>${this.originCity.name}</strong> → (Select Drop District)</span>`;
        } else if (!this.originCity && this.destCity) {
          displayRoute.innerHTML = `<span>(Select Pickup District) → Drop: <strong>${this.destCity.name}</strong></span>`;
        } else {
          displayRoute.innerHTML = `<span>Select Pickup & Drop District above to calculate live fare</span>`;
        }
      }

      if (distBadge) distBadge.textContent = "Bihar Fixed Rates";
      if (timeBadge) timeBadge.textContent = "Instant Booking";
      if (tollBadge) tollBadge.textContent = "Toll & GST Included";

      this.renderFleetCards();
      this.updateCheckFareButtonState();
      return;
    }

    const knownRoute = OTB_POPULAR_ROUTES.find(r => 
      (r.fromId === this.originCity.id && r.toId === this.destCity.id) ||
      (r.fromId === this.destCity.id && r.toId === this.originCity.id)
    );

    if (knownRoute) {
      this.calculatedDistanceKm = knownRoute.distanceKm;
      this.calculatedDuration = knownRoute.duration;
      this.calculatedToll = knownRoute.toll;
    } else {
      // Calculate curved highway distance
      const dLat = (this.destCity.lat - this.originCity.lat) * Math.PI / 180;
      const dLng = (this.destCity.lng - this.originCity.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.originCity.lat * Math.PI / 180) * Math.cos(this.destCity.lat * Math.PI / 180) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const rawKm = 6371 * c;
      this.calculatedDistanceKm = Math.max(40, Math.round(rawKm * 1.30));
      
      const speedKmH = 48; // Standard Bihar highway average with Setu/bridges
      const totalMin = Math.round((this.calculatedDistanceKm / speedKmH) * 60);
      const hrs = Math.floor(totalMin / 60);
      const mins = totalMin % 60;
      this.calculatedDuration = `${hrs}h ${mins}m`;
      this.calculatedToll = Math.round(this.calculatedDistanceKm * 1.1);
    }

    // Update Route Bar
    const displayRoute = document.getElementById("rf-display-route");
    const distBadge = document.getElementById("rf-dist-badge");
    const timeBadge = document.getElementById("rf-time-badge");
    const tollBadge = document.getElementById("rf-toll-badge");

    if (displayRoute) {
      if (this.tripType === "local") {
        const pkg = OTB_LOCAL_PACKAGES.find(p => p.id === this.localPackageId);
        displayRoute.innerHTML = `<span>Local Hourly Package: <strong>${this.originCity.name}</strong> (${pkg?.name || '8 Hr / 80 KM'})</span>`;
      } else if (this.tripType === "roundtrip") {
        displayRoute.innerHTML = `<span><strong>${this.originCity.name}</strong> (${this.originCity.hindiName}) ⇄ <strong>${this.destCity.name}</strong> (${this.destCity.hindiName}) <span style="color: var(--owc-primary); font-weight: 700; margin-left: 6px;">(Round-Trip)</span></span>`;
      } else if (this.tripType === "airport") {
        displayRoute.innerHTML = `<span><strong>${this.originCity.name}</strong> → <strong>Airport Transfer</strong></span>`;
      } else {
        displayRoute.innerHTML = `<span><strong>${this.originCity.name}</strong> (${this.originCity.hindiName}) → <strong>${this.destCity.name}</strong> (${this.destCity.hindiName}) <span style="color: #059669; font-weight: 700; margin-left: 6px;">(Zero Return Fare)</span></span>`;
      }
    }

    if (distBadge) distBadge.textContent = this.tripType === "local" ? "80 KM Package" : `${this.calculatedDistanceKm} KM Highway Route`;
    if (timeBadge) timeBadge.textContent = this.tripType === "local" ? "8 Hours" : `~${this.calculatedDuration}`;
    if (tollBadge) tollBadge.textContent = "Tolls, Fastag & GST Included";

    // Render Fleet Cards
    this.renderFleetCards();

    // Update Leaflet Map Polyline
    if (window.onewayMap) {
      window.onewayMap.updateRoute(this.originCity, this.destCity, this.calculatedDistanceKm);
    }
    this.updateCheckFareButtonState();
  }

  renderFleetCards() {
    const container = document.getElementById("cab-cards-grid");
    if (!container) return;

    container.innerHTML = OTB_FLEET.map(fleet => {
      let finalPrice = 0;
      let savings = 0;

      if (this.tripType === "local") {
        const pkg = OTB_LOCAL_PACKAGES.find(p => p.id === this.localPackageId) || OTB_LOCAL_PACKAGES[1];
        if (fleet.id === "hatchback") finalPrice = pkg.baseHatch;
        else if (fleet.id === "sedan") finalPrice = pkg.baseSedan;
        else if (fleet.id === "sedan_prime") finalPrice = Math.round(pkg.baseSedan * 1.2);
        else if (fleet.id === "suv") finalPrice = pkg.baseSuv;
        else finalPrice = Math.round(pkg.baseSuv * 1.4);
        savings = Math.round(finalPrice * 0.25);
      } else {
        let baseFare = this.calculatedDistanceKm * fleet.ratePerKm;
        baseFare = Math.max(baseFare, fleet.id === 'hatchback' ? 1698 : fleet.id === 'sedan' ? 2198 : 3398);
        
        if (this.tripType === "roundtrip") {
          baseFare = (baseFare * 1.88); // 12% discount for roundtrip
        }

        finalPrice = Math.max(1000, Math.round(baseFare));
        savings = Math.round(baseFare * 0.95);
      }

      const isSelected = this.selectedCabId === fleet.id;
      let carSvg = '';
      if (fleet.id === 'suv' || fleet.id === 'innova_crysta') {
        carSvg = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--owc-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-4c0-.9-.7-1.7-1.5-1.9L16 9.5 13 6H5c-.6 0-1.1.4-1.4.9L2.1 11c-.1.3-.1.7-.1 1v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M5 11h14M10 6v5M14 6v5"/></svg>`;
      } else if (fleet.id === 'sedan' || fleet.id === 'sedan_prime') {
        carSvg = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--owc-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H6c-.6 0-1.1.4-1.4.9l-1.5 2.8C3.1 11 3 11.5 3 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M5 11h14"/></svg>`;
      } else {
        carSvg = `<svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--owc-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3.5c0-.9-.7-1.6-1.5-1.8L16 10l-2-3H6c-.6 0-1.1.4-1.4.9l-2 3.1C2.3 11.4 2 11.9 2 12.5v3.5c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="17" r="2.5"/><path d="M5 11h13"/></svg>`;
      }

      return `
        <div class="cab-tier-card ${isSelected ? 'selected' : ''}" onclick="window.bookingManager.selectCabTier('${fleet.id}')">
          <span class="cab-ribbon-tag">${fleet.badge}</span>
          <div class="cab-card-top">
            <div class="cab-header-info">
              <h3>${fleet.category}</h3>
              <div class="cab-models-sub">${fleet.models}</div>
            </div>
            <div class="cab-icon-hero">
              ${carSvg}
            </div>
          </div>

          <div class="cab-specs-chips">
            <span class="cab-spec-chip">${fleet.seats} Seats</span>
            <span class="cab-spec-chip">${fleet.luggage}</span>
            <span class="cab-spec-chip">${fleet.ac}</span>
            <span class="cab-spec-chip"><svg width="11" height="11" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" style="margin-right:2px; vertical-align: -1px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>${fleet.rating}</span>
          </div>

          <p style="font-size: 12.5px; color: var(--owc-text-muted); line-height: 1.4; margin-bottom: 12px;">
            ${fleet.description}
          </p>

          <div class="cab-price-container">
            <div class="cab-price-row">
              <div class="cab-price-main">₹${finalPrice.toLocaleString('en-IN')}</div>
              <div class="cab-tax-note">Fixed (Toll, GST & Allowance incl.)</div>
            </div>
            <span class="cab-savings-pill">Saved ~₹${savings.toLocaleString('en-IN')} vs Return Cab</span>
          </div>

          <button type="button" class="btn-select-cab" onclick="window.bookingManager.startCheckout('${fleet.id}', ${finalPrice})">
            ${isSelected ? 'Selected — Book Now' : 'Select ' + fleet.category}
          </button>
        </div>
      `;
    }).join("");
  }

  selectCabTier(cabId) {
    this.selectedCabId = cabId;
    this.renderFleetCards();
  }

  loadRoutePreset(fromId, toId) {
    const from = OTB_CITIES.find(c => c.id === fromId);
    const to = OTB_CITIES.find(c => c.id === toId);
    if (!from || !to) return;

    this.originCity = from;
    this.destCity = to;

    const pInput = document.getElementById("input-pickup");
    const dInput = document.getElementById("input-drop");
    if (pInput) pInput.value = `${from.name} (${from.hindiName}), ${from.state}`;
    if (dInput) dInput.value = `${to.name} (${to.hindiName}), ${to.state}`;

    window.closeAllModals();

    const phoneInput = document.getElementById("input-fare-phone");
    const phoneVal = phoneInput ? phoneInput.value.trim().replace(/\D/g, "") : this.userPhone;

    if (!phoneVal || phoneVal.length !== 10) {
      this.updateCheckFareButtonState();
      const hero = document.getElementById("booking-hero");
      if (hero) hero.scrollIntoView({ behavior: "smooth" });
      if (phoneInput) phoneInput.focus();
      window.showToast(`Selected ${from.name} → ${to.name}. Please enter mobile number & tap Check Fare.`, "info");
    } else {
      this.handleCheckFare(false);
      window.showToast(`Selected route: ${from.name} → ${to.name}`, "success");
    }
  }

  renderPopularRouteChips() {
    const container = document.getElementById("hero-quick-routes");
    if (!container) return;

    container.innerHTML = OTB_POPULAR_ROUTES.slice(0, 6).map(r => `
      <button type="button" class="quick-route-chip" onclick="window.bookingManager.loadRoutePreset('${r.fromId}', '${r.toId}')">
        ${r.from} → ${r.to} • ₹${r.baseFareHatchback}
      </button>
    `).join("");
  }

  renderFriendsHeroReviews() {
    const container = document.getElementById("fr-hero-feed");
    if (!container) return;

    const list = typeof getActiveReviews === "function" ? getActiveReviews() : (window.OTB_PASSENGER_REVIEWS || []);
    container.innerHTML = list.slice(0, 3).map(rev => {
      const quote = rev.comment ? (rev.comment.length > 82 ? rev.comment.substring(0, 79) + '...' : rev.comment) : 'Punctual driver, clean AC car and zero return fare.';
      return `
        <div class="fr-feed-item" onclick="window.openFriendsReviewModal()" title="Click to view all verified passenger reviews">
          <div class="fr-feed-top">
            <div class="fr-feed-user">
              <div class="fr-avatar-badge" style="background: ${rev.avatarBg || '#0084e8'}">${rev.initials || rev.name.charAt(0)}</div>
              <div class="fr-feed-user-meta">
                <div class="fr-feed-name">
                  <span class="fr-author-name">${rev.name}</span>
                  <span class="fr-verified-badge">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align: -1px; margin-right: 2px;"><polyline points="20 6 9 17 4 12"/></svg>
                    Verified Trip
                  </span>
                </div>
                <div class="fr-feed-route-tag">${rev.route} &bull; ${rev.car}</div>
              </div>
            </div>
            <div class="fr-feed-rating">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" style="margin-right: 2px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>${rev.rating}</span>
            </div>
          </div>
          <p class="fr-feed-quote">"${quote}"</p>
        </div>
      `;
    }).join("");
  }

  renderWhyChooseCards() {
    const container = document.getElementById("why-choose-grid");
    if (!container) return;

    container.innerHTML = OTB_WHY_CHOOSE_US.map(item => `
      <div class="why-feature-card">
        <div class="why-num-box">${item.num}</div>
        <div>
          <h3>${item.title}</h3>
          <p>${item.desc}</p>
        </div>
      </div>
    `).join("");
  }

  renderTestimonials() {
    const container = document.getElementById("testimonials-grid");
    if (!container) return;

    const list = typeof getActiveReviews === "function" ? getActiveReviews() : (window.OTB_PASSENGER_REVIEWS || []);
    container.innerHTML = list.slice(0, 3).map(t => `
      <div class="testimonial-card">
        <div class="quote-icon-decor">“</div>
        <div>
          <div class="test-stars-row" style="color: #f59e0b; font-weight: 800; font-size: 13.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${t.rating} / 5.0 Rating</span>
          </div>
          <p class="test-quote-text">"${t.comment}"</p>
        </div>
        <div class="test-author-block">
          <div class="test-author-name">${t.name}</div>
          <div class="test-author-route" style="color: var(--owc-primary); font-weight: 600; font-size: 12px; margin-top: 2px;">Verified Route: ${t.route}</div>
        </div>
      </div>
    `).join("");
  }

  renderMajorCities() {
    const container = document.getElementById("major-cities-grid");
    if (!container) return;

    const top8 = ["patna", "gaya", "muzaffarpur", "bhagalpur", "darbhanga", "nalanda", "rohtas", "purnia"];
    const filtered = OTB_CITIES.filter(c => top8.includes(c.id));

    container.innerHTML = filtered.map(c => `
      <div class="city-hub-card" onclick="window.bookingManager.loadRoutePreset('patna', '${c.id}')">
        <div class="city-hub-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
        <div>
          <div class="city-hub-name">${c.name} (${c.hindiName})</div>
          <div class="city-hub-state">${c.division} Division • ${c.tag}</div>
        </div>
      </div>
    `).join("");
  }

  renderFAQs() {
    const container = document.getElementById("faq-accordion-container");
    if (!container) return;

    container.innerHTML = OTB_FAQS.map((faq, idx) => `
      <div class="faq-item ${idx === 0 ? 'active' : ''}">
        <button type="button" class="faq-question-btn" onclick="this.parentElement.classList.toggle('active')">
          <span>${faq.q}</span>
          <span class="faq-chevron">▼</span>
        </button>
        <div class="faq-answer-pane">
          ${faq.a}
        </div>
      </div>
    `).join("");
  }

  renderFooterRoutes() {
    const container = document.getElementById("footer-routes-list");
    if (!container) return;

    container.innerHTML = OTB_POPULAR_ROUTES.map(r => `
      <a href="javascript:void(0)" onclick="window.bookingManager.loadRoutePreset('${r.fromId}', '${r.toId}')">
        ${r.from} to ${r.to} Taxi (from ₹${r.baseFareHatchback})
      </a>
    `).join("");
  }

  /* ==========================================================================
     CHECKOUT, PASSENGER DETAILS & TICKET CONFIRMATION
     ========================================================================== */
  startCheckout(cabId, price) {
    this.selectedCabId = cabId;
    const fleet = OTB_FLEET.find(f => f.id === cabId) || OTB_FLEET[1];
    const checkoutModal = document.getElementById("modal-checkout");
    const checkoutBody = document.getElementById("modal-checkout-body");

    if (!checkoutModal || !checkoutBody) return;

    checkoutBody.innerHTML = `
      <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px;">
        
        <!-- Left: Passenger Form -->
        <div>
          <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 14px; color: var(--owc-text);">1. Passenger Information</h3>
          
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
            <div class="input-field-group">
              <span class="input-icon-clean">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <div class="input-content">
                <label>FULL NAME</label>
                <input type="text" id="chk-name" value="${this.passengerDetails.name}" placeholder="Enter full name">
              </div>
            </div>

            <div class="input-field-group">
              <span class="input-icon-clean">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </span>
              <div class="input-content">
                <label>MOBILE NUMBER (FOR DRIVER SMS/WHATSAPP)</label>
                <input type="tel" id="chk-phone" value="${this.passengerDetails.phone}" placeholder="10-digit mobile number">
              </div>
            </div>

            <div class="input-field-group">
              <span class="input-icon-clean">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <div class="input-content">
                <label>EMAIL (FOR GST TAX INVOICE)</label>
                <input type="email" id="chk-email" value="${this.passengerDetails.email}" placeholder="your.name@example.com">
              </div>
            </div>

            <!-- Exact Pickup Address with Auto-Type Chips & Recommendations -->
            <div class="input-field-group">
              <span class="input-icon-clean">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </span>
              <div class="input-content" style="position: relative;">
                <label>EXACT PICKUP ADDRESS / TERMINAL / LANDMARK</label>
                <input type="text" id="chk-pickup-addr" value="${this.passengerDetails.pickupAddress}" placeholder="Terminal, platform, hospital, or street address" autocomplete="off">
                <div class="checkout-loc-dropdown" id="chk-pickup-dropdown" style="display: none;"></div>
              </div>
            </div>
            <!-- Quick Auto-Type Chips for Pickup -->
            <div class="auto-type-chips-wrapper" id="pickup-auto-chips">
              <div class="auto-type-loading"><span>Loading popular pickup hubs...</span></div>
            </div>

            <!-- Exact Drop Address with Auto-Type Chips & Recommendations -->
            <div class="input-field-group" style="margin-top: 6px;">
              <span class="input-icon-clean">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              </span>
              <div class="input-content" style="position: relative;">
                <label>EXACT DROP DESTINATION ADDRESS / HOTEL / VILLAGE</label>
                <input type="text" id="chk-drop-addr" value="${this.passengerDetails.dropAddress}" placeholder="Hotel, temple, hospital, station, or locality address" autocomplete="off">
                <div class="checkout-loc-dropdown" id="chk-drop-dropdown" style="display: none;"></div>
              </div>
            </div>
            <!-- Quick Auto-Type Chips for Drop -->
            <div class="auto-type-chips-wrapper" id="drop-auto-chips">
              <div class="auto-type-loading"><span>Loading popular drop locations...</span></div>
            </div>
          </div>

          <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 14px; color: var(--owc-text);">2. Payment Method</h3>
          
          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            <label style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 2px solid var(--owc-primary); border-radius: var(--radius-md); background: var(--owc-primary-subtle); cursor: pointer;">
              <input type="radio" name="pay-method" value="Cash / UPI to Driver" checked>
              <div>
                <strong>Pay 100% Cash / UPI to Driver (Zero Advance)</strong>
                <div style="font-size: 12px; color: var(--owc-text-muted);">Pay securely to your captain only upon arriving safely.</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 1px solid var(--owc-border); border-radius: var(--radius-md); cursor: pointer;">
              <input type="radio" name="pay-method" value="Full Online Payment">
              <div>
                <strong>Pay Online (UPI / GPay / PhonePe / Cards)</strong>
                <div style="font-size: 12px; color: var(--owc-text-muted);">Instant prepaid confirmation with digital invoice.</div>
              </div>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border: 1px solid var(--owc-border); border-radius: var(--radius-md); cursor: pointer;">
              <input type="radio" name="pay-method" value="OTB Wallet">
              <div>
                <strong>OneWayTaxiBihar Wallet (Balance: ₹750)</strong>
                <div style="font-size: 12px; color: var(--owc-text-muted);">Deduct instantly from your referral bonus credits.</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Right: Ride Summary Card -->
        <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 20px;">
          <h3 style="font-size: 16px; font-weight: 800; margin-bottom: 14px; color: var(--owc-text);">Ride Summary</h3>
          
          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span style="color: var(--owc-text-muted);">Trip Type:</span>
            <strong>${this.tripType.toUpperCase()}</strong>
          </div>

          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span style="color: var(--owc-text-muted);">Route:</span>
            <strong>${this.originCity.name} → ${this.destCity.name}</strong>
          </div>

          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span style="color: var(--owc-text-muted);">Vehicle Class:</span>
            <strong>${fleet.category} (${fleet.models})</strong>
          </div>

          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span style="color: var(--owc-text-muted);">Date & Time:</span>
            <strong>${this.pickupDate} at ${this.pickupTime}</strong>
          </div>

          <div style="font-size: 14px; margin-bottom: 12px; display: flex; justify-content: space-between;">
            <span style="color: var(--owc-text-muted);">Est. Distance:</span>
            <strong>${this.calculatedDistanceKm} KM (~${this.calculatedDuration})</strong>
          </div>

          <hr style="border: none; border-top: 1px dashed var(--owc-border); margin: 16px 0;">

          <div style="font-size: 14px; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>Base Outstation Fare:</span>
            <span>₹${(price - 120).toLocaleString('en-IN')}</span>
          </div>

          <div style="font-size: 14px; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>Highway Tolls & Fastag:</span>
            <span style="color: var(--owc-success); font-weight: 700;">Included</span>
          </div>

          <div style="font-size: 14px; margin-bottom: 8px; display: flex; justify-content: space-between;">
            <span>Driver Allowance & 5% GST:</span>
            <span style="color: var(--owc-success); font-weight: 700;">Included</span>
          </div>

          ${window.currentUser && window.currentUser.walletBalance > 0 ? `
            <div style="background: rgba(5, 163, 87, 0.08); border: 1.5px dashed #059669; border-radius: var(--radius-md); padding: 10px 12px; margin: 12px 0; display: flex; align-items: center; justify-content: space-between;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                <input type="checkbox" id="chk-use-wallet" checked onchange="window.bookingManager.updateCheckoutPayable(${price})" style="accent-color: var(--owc-primary); width: 18px; height: 18px;">
                <div>
                  <strong style="color: var(--owc-text); font-size: 13px;">Apply Wallet Balance</strong>
                  <div style="font-size: 11px; color: var(--owc-text-muted);">Available: ₹${window.currentUser.walletBalance}</div>
                </div>
              </label>
              <span style="color: #059669; font-weight: 800; font-size: 13.5px;" id="chk-wallet-deduct-label">-₹${Math.min(window.currentUser.walletBalance, price)}</span>
            </div>
          ` : `
            <div style="background: var(--owc-slate-100); border-radius: var(--radius-md); padding: 8px 12px; margin: 10px 0; font-size: 12px; color: var(--owc-text-muted); display: flex; align-items: center; justify-content: space-between;">
              <span>Login with OTP to claim ₹100 Welcome Cash</span>
              <button type="button" onclick="window.openAuthModal()" style="border: none; background: var(--owc-primary); color: white; padding: 4px 8px; border-radius: 4px; font-weight: 700; cursor: pointer; font-size: 11px;">Login</button>
            </div>
          `}

          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 16px; padding-top: 12px; border-top: 2px solid var(--owc-border);">
            <span style="font-size: 16px; font-weight: 800;">Total Payable:</span>
            <span style="font-size: 26px; font-weight: 900; color: var(--owc-primary);" id="chk-total-payable">₹${(window.currentUser && window.currentUser.walletBalance > 0 ? Math.max(0, price - Math.min(window.currentUser.walletBalance, price)) : price).toLocaleString('en-IN')}</span>
          </div>

          <button type="button" class="check-fare-primary-btn" style="margin-top: 20px; margin-bottom: 0;" onclick="window.bookingManager.confirmBooking(${price})">
            Confirm &amp; Book OneWay Cab →
          </button>
        </div>

      </div>
    `;

    checkoutModal.classList.add("open");
    this.setupCheckoutLocationAutocomplete();
  }

  updateCheckoutPayable(basePrice) {
    const chk = document.getElementById("chk-use-wallet");
    const totalEl = document.getElementById("chk-total-payable");
    const walletBal = window.currentUser?.walletBalance || 0;
    const isUsing = chk && chk.checked;
    const deduction = isUsing ? Math.min(walletBal, basePrice) : 0;
    const finalAmt = Math.max(0, basePrice - deduction);

    if (totalEl) totalEl.textContent = `₹${finalAmt.toLocaleString('en-IN')}`;
  }

  /* ==========================================================================
     INTELLIGENT LOCATION RECOMMENDATIONS & AUTO-TYPE CONTROLLER
     ========================================================================== */
  async setupCheckoutLocationAutocomplete() {
    const pickupInput = document.getElementById("chk-pickup-addr");
    const dropInput = document.getElementById("chk-drop-addr");
    const pickupChipsContainer = document.getElementById("pickup-auto-chips");
    const dropChipsContainer = document.getElementById("drop-auto-chips");
    const pickupDropdown = document.getElementById("chk-pickup-dropdown");
    const dropDropdown = document.getElementById("chk-drop-dropdown");

    if (!pickupInput || !dropInput) return;

    const originCityId = this.originCity ? this.originCity.id : "patna";
    const destCityId = this.destCity ? this.destCity.id : "gaya";
    const originCityName = this.originCity ? this.originCity.name : "Pickup City";
    const destCityName = this.destCity ? this.destCity.name : "Drop Destination";

    // 1. Fetch recommendations from backend with offline fallback
    let pickupRecs = null;
    let dropRecs = null;
    try {
      [pickupRecs, dropRecs] = await Promise.all([
        ApiClient.getLocationRecommendations(originCityId, "pickup"),
        ApiClient.getLocationRecommendations(destCityId, "drop")
      ]);
    } catch (e) {
      console.warn("Location recommendations fetch failed, using fallback:", e);
    }

    // 2. Render Quick Auto-Type Chips for Pickup
    if (pickupChipsContainer) {
      const chips = pickupRecs && pickupRecs.quickChips && pickupRecs.quickChips.length > 0 
        ? pickupRecs.quickChips 
        : [
            { label: "Airport Terminal", fullAddress: `Jay Prakash Narayan Airport, Terminal 1, ${originCityName}` },
            { label: "Railway Station (Main Gate)", fullAddress: `${originCityName} Junction, Platform 1 Main Gate, Station Road` },
            { label: "Central Bus Stand / ISBT", fullAddress: `Central Bus Stand / ISBT, ${originCityName}` },
            { label: "Civil / AIIMS Hospital", fullAddress: `Main Civil Hospital / Emergency Gate, ${originCityName}` },
            { label: "Main City Chowk", fullAddress: `Main City Chowk / Central Road, ${originCityName}` }
          ];

      pickupChipsContainer.innerHTML = `
        <div class="auto-type-header">
          <span>Popular ${originCityName} Pickup Hubs:</span>
        </div>
        <div class="auto-type-chips-list">
          ${chips.map(c => `
            <button type="button" class="auto-type-chip" data-addr="${encodeURIComponent(c.fullAddress)}" title="1-Tap to auto-fill: ${c.fullAddress}">
              ${c.label}
            </button>
          `).join("")}
        </div>
      `;

      pickupChipsContainer.querySelectorAll(".auto-type-chip").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const addr = decodeURIComponent(btn.getAttribute("data-addr"));
          pickupInput.value = addr;
          this.passengerDetails.pickupAddress = addr;
          if (pickupDropdown) pickupDropdown.style.display = "none";
          btn.classList.add("chip-selected");
          setTimeout(() => btn.classList.remove("chip-selected"), 600);
          window.showToast(`Selected pickup: ${addr.split(',')[0]}`, "success");
        });
      });
    }

    // 3. Render Quick Auto-Type Chips for Drop
    if (dropChipsContainer) {
      const chips = dropRecs && dropRecs.quickChips && dropRecs.quickChips.length > 0 
        ? dropRecs.quickChips 
        : [
            { label: "Main Landmark / Temple", fullAddress: `Main Temple Complex / Historic Center, ${destCityName}` },
            { label: "Railway Junction", fullAddress: `${destCityName} Junction Railway Station, Main Exit` },
            { label: "City Center / Hotel Area", fullAddress: `Hotel / Guest House Area, ${destCityName}` },
            { label: "Central Bus Terminal", fullAddress: `Main Bus Stand, ${destCityName}` },
            { label: "District Hospital", fullAddress: `District Sadar Hospital, ${destCityName}` }
          ];

      dropChipsContainer.innerHTML = `
        <div class="auto-type-header">
          <span>Popular ${destCityName} Drop Destinations:</span>
        </div>
        <div class="auto-type-chips-list">
          ${chips.map(c => `
            <button type="button" class="auto-type-chip" data-addr="${encodeURIComponent(c.fullAddress)}" title="1-Tap to auto-fill: ${c.fullAddress}">
              ${c.label}
            </button>
          `).join("")}
        </div>
      `;

      dropChipsContainer.querySelectorAll(".auto-type-chip").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const addr = decodeURIComponent(btn.getAttribute("data-addr"));
          dropInput.value = addr;
          this.passengerDetails.dropAddress = addr;
          if (dropDropdown) dropDropdown.style.display = "none";
          btn.classList.add("chip-selected");
          setTimeout(() => btn.classList.remove("chip-selected"), 600);
          window.showToast(`Selected drop: ${addr.split(',')[0]}`, "success");
        });
      });
    }

    // 4. Setup Dynamic Recommendation Dropdown on Focus & Typing
    const setupFieldDropdown = (input, dropdown, cityId, cityName, type) => {
      if (!input || !dropdown) return;

      const highlight = (text, term) => {
        if (!term || term.length < 2) return text;
        const idx = text.toLowerCase().indexOf(term.toLowerCase());
        if (idx === -1) return text;
        return text.substring(0, idx) + `<span class="chk-search-highlight">${text.substring(idx, idx + term.length)}</span>` + text.substring(idx + term.length);
      };

      const renderList = (items, query = "") => {
        if (!items || items.length === 0) {
          dropdown.innerHTML = `
            <div class="chk-loc-empty">
              <span>No pre-saved landmark matching "<strong>${query}</strong>".</span>
              <div style="font-size: 11px; margin-top: 4px; color: var(--owc-primary); font-weight: 600;">
                You can freely type your exact building, street, or village address.
              </div>
            </div>
          `;
          dropdown.style.display = "block";
          return;
        }

        // Group by category
        const groups = {};
        items.forEach(it => {
          const cat = it.category || "Recommended Hubs";
          if (!groups[cat]) groups[cat] = [];
          groups[cat].push(it);
        });

        let html = "";
        for (const [catName, catItems] of Object.entries(groups)) {
          html += `
            <div class="chk-loc-group-header">
              <span>${catName.toUpperCase()}</span>
              <span>1-Tap Auto-Type</span>
            </div>
          `;
          catItems.forEach((it, idx) => {
            html += `
              <div class="chk-loc-item ${idx === 0 && query ? 'active-item' : ''}" data-addr="${encodeURIComponent(it.address)}">
                <div class="chk-loc-item-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></div>
                <div class="chk-loc-item-text">
                  <div class="chk-loc-item-name">
                    ${highlight(it.name, query)}
                    ${it.hindiName ? `<span class="chk-loc-hindi">(${it.hindiName})</span>` : ''}
                  </div>
                  <div class="chk-loc-item-sub">${highlight(it.address, query)}</div>
                </div>
                <span class="chk-loc-tag">${it.category}</span>
              </div>
            `;
          });
        }

        dropdown.innerHTML = html;
        dropdown.style.display = "block";

        dropdown.querySelectorAll(".chk-loc-item").forEach(item => {
          item.addEventListener("click", () => {
            const addr = decodeURIComponent(item.getAttribute("data-addr"));
            input.value = addr;
            if (type === "pickup") {
              this.passengerDetails.pickupAddress = addr;
            } else {
              this.passengerDetails.dropAddress = addr;
            }
            dropdown.style.display = "none";
            window.showToast(`Selected: ${addr.split(',')[0]}`, "success");
          });
        });
      };

      input.addEventListener("focus", async () => {
        const query = input.value.trim();
        if (!query) {
          const recs = type === "pickup" ? pickupRecs : dropRecs;
          if (recs && recs.locations && recs.locations.length > 0) {
            renderList(recs.locations);
          } else {
            const results = await ApiClient.getLocationRecommendations(cityId, type);
            renderList(results?.locations || []);
          }
        } else {
          const results = await ApiClient.searchLocations(query, cityId);
          renderList(results, query);
        }
      });

      input.addEventListener("input", async (e) => {
        const query = e.target.value.trim();
        if (type === "pickup") this.passengerDetails.pickupAddress = query;
        else this.passengerDetails.dropAddress = query;

        const results = await ApiClient.searchLocations(query, cityId);
        renderList(results, query);
      });

      input.addEventListener("keydown", (e) => {
        const items = dropdown.querySelectorAll(".chk-loc-item");
        if (!items.length || dropdown.style.display === "none") return;

        let activeIdx = -1;
        items.forEach((it, idx) => {
          if (it.classList.contains("active-item")) activeIdx = idx;
        });

        if (e.key === "ArrowDown") {
          e.preventDefault();
          const nextIdx = (activeIdx + 1) % items.length;
          items.forEach(it => it.classList.remove("active-item"));
          items[nextIdx].classList.add("active-item");
          items[nextIdx].scrollIntoView({ block: "nearest" });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prevIdx = (activeIdx - 1 + items.length) % items.length;
          items.forEach(it => it.classList.remove("active-item"));
          items[prevIdx].classList.add("active-item");
          items[prevIdx].scrollIntoView({ block: "nearest" });
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (activeIdx >= 0 && items[activeIdx]) {
            items[activeIdx].click();
          } else if (items.length > 0) {
            items[0].click();
          }
        } else if (e.key === "Escape") {
          dropdown.style.display = "none";
        }
      });
    };

    setupFieldDropdown(pickupInput, pickupDropdown, originCityId, originCityName, "pickup");
    setupFieldDropdown(dropInput, dropDropdown, destCityId, destCityName, "drop");

    // Close dropdowns on outside clicks
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#chk-pickup-addr") && !e.target.closest("#chk-pickup-dropdown")) {
        if (pickupDropdown) pickupDropdown.style.display = "none";
      }
      if (!e.target.closest("#chk-drop-addr") && !e.target.closest("#chk-drop-dropdown")) {
        if (dropDropdown) dropDropdown.style.display = "none";
      }
    });
  }

  async confirmBooking(price) {
    const name = document.getElementById("chk-name")?.value || this.passengerDetails.name;
    const phone = document.getElementById("chk-phone")?.value || this.passengerDetails.phone;
    const email = document.getElementById("chk-email")?.value || this.passengerDetails.email;
    const pickupAddr = document.getElementById("chk-pickup-addr")?.value || this.passengerDetails.pickupAddress;
    const dropAddr = document.getElementById("chk-drop-addr")?.value || this.passengerDetails.dropAddress;
    
    const payRadios = document.getElementsByName("pay-method");
    let method = "Cash / UPI to Driver";
    for (const r of payRadios) {
      if (r.checked) method = r.value;
    }

    const chkWallet = document.getElementById("chk-use-wallet");
    const walletBal = window.currentUser?.walletBalance || 0;
    const isUsingWallet = chkWallet && chkWallet.checked;
    const walletDeducted = isUsingWallet ? Math.min(walletBal, price) : 0;
    const finalPaid = Math.max(0, price - walletDeducted);

    if (walletDeducted > 0 && window.currentUser) {
      window.currentUser.walletBalance = Math.max(0, window.currentUser.walletBalance - walletDeducted);
      if (window.renderNavAuth) window.renderNavAuth();
    }

    const bookingId = `OTB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const fleet = OTB_FLEET.find(f => f.id === this.selectedCabId) || OTB_FLEET[1];

    const bookingRecord = {
      bookingId: bookingId,
      tripType: this.tripType,
      originCity: this.originCity.name,
      destCity: this.destCity.name,
      pickupDate: this.pickupDate,
      pickupTime: this.pickupTime,
      distanceKm: this.calculatedDistanceKm,
      duration: this.calculatedDuration,
      fleetClass: fleet.category,
      fleetModel: fleet.models,
      passengerName: name,
      passengerPhone: phone,
      passengerEmail: email,
      pickupAddress: pickupAddr,
      dropAddress: dropAddr,
      totalFare: finalPaid,
      walletUsed: walletDeducted,
      originalFare: price,
      paymentMethod: method,
      paymentStatus: method === "Cash / UPI to Driver" ? "Pending (Pay on Arrival)" : "Paid",
      bookingStatus: "Confirmed",
      captainName: "Dharmendra Yadav (Bihar Highway Expert)",
      captainPhone: "+91 94310 11982",
      vehicleNumber: "BR 01 PB 8829",
      otpPin: "4829",
      createdAt: new Date().toISOString()
    };

    this.activeBooking = bookingRecord;
    await ApiClient.createBooking(bookingRecord);

    const phoneInput = document.getElementById("input-fare-phone");
    if (phoneInput) {
      phoneInput.value = "";
    }
    localStorage.removeItem("oneway_fare_phone");

    window.closeAllModals();
    this.renderBookingConfirmation(bookingRecord);
  }

  renderBookingConfirmation(booking) {
    const confModal = document.getElementById("modal-confirmation");
    const confBody = document.getElementById("modal-confirmation-body");

    if (!confModal || !confBody) return;

    confBody.innerHTML = `
      <div style="text-align: center; padding: 10px 0;">
        <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #059669; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        
        <h2 style="font-size: 22px; font-weight: 900; color: var(--owc-text); margin-bottom: 4px;">OneWay Taxi Booking Confirmed!</h2>
        <p style="font-size: 14px; color: var(--owc-text-muted); margin-bottom: 16px;">
          Booking ID: <strong style="color: var(--owc-primary); font-size: 16px;">${booking.bookingId}</strong>
        </p>

        <!-- Driver Assigned Card -->
        <div style="background: var(--owc-slate-50); border: 1px solid var(--owc-border); border-radius: var(--radius-lg); padding: 18px; text-align: left; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 42px; height: 42px; border-radius: 50%; background: var(--owc-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <strong style="font-size: 15px; color: var(--owc-text);">${booking.captainName}</strong>
                <div style="font-size: 12px; color: var(--owc-text-muted);">Vehicle: ${booking.vehicleNumber} (${booking.fleetModel})</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: var(--owc-text-dim);">START OTP</div>
              <strong style="font-size: 18px; color: var(--owc-primary);">${booking.otpPin}</strong>
            </div>
          </div>

          <div style="font-size: 13px; color: var(--owc-text-muted); line-height: 1.6; border-top: 1px dashed var(--owc-border); padding-top: 10px;">
            Pickup: <strong>${booking.pickupAddress}</strong><br>
            Time: <strong>${booking.pickupDate} at ${booking.pickupTime}</strong><br>
            Total Fare: <strong>₹${booking.totalFare.toLocaleString('en-IN')}</strong> (${booking.paymentMethod})
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 10px;">
          <button type="button" class="btn-select-cab" style="flex: 1; background: var(--owc-primary); display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="window.closeAllModals(); window.startLiveTrackingSimulation('${booking.bookingId}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
            Track Cab Live GPS
          </button>
          <button type="button" class="btn-nav-outline" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="window.closeAllModals(); window.printTaxInvoice('${booking.bookingId}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Print Tax Invoice
          </button>
        </div>
      </div>
    `;

    confModal.classList.add("open");
    window.showToast("Booking successfully confirmed with OneWayTaxiBihar!", "success");
  }
}

if (typeof window !== "undefined") {
  window.BookingManager = BookingManager;
}
