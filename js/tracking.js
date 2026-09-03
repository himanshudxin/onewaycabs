/**
 * Live Trip Tracking & Official GST Tax Invoice Engine
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Simulates real-time driver arrival, OTP verification, highway cruise, SOS safety, and GST tax invoice generation.
 */

class TripTrackingManager {
  constructor() {
    this.currentTrip = null;
    this.statusStep = 0;
    this.timer = null;
    this.statuses = [
      { code: "ASSIGNED", title: "Captain Assigned", subtitle: "Captain is heading to your doorstep pickup location in Patna (ETA: 5 mins)", progress: 20 },
      { code: "ARRIVED", title: "Captain Arrived at Pickup Location", subtitle: "Please share OTP with your Captain to start the highway trip", progress: 45 },
      { code: "IN_TRANSIT", title: "Trip Started • Cruising on Highway", subtitle: "On National Highway with continuous AC and Fastag automated toll clearance", progress: 78 },
      { code: "COMPLETED", title: "Trip Completed Successfully", subtitle: "Arrived safely at your destination in Bihar. Thank you for riding with OneWayTaxiBihar!", progress: 100 }
    ];
  }

  startTrip(booking) {
    this.currentTrip = booking;
    this.statusStep = 0;

    const modal = document.getElementById("trip-tracking-modal");
    if (!modal) return;

    this.renderTrackingModal();
    modal.classList.add("active");

    // Clear previous timer
    if (this.timer) clearInterval(this.timer);

    // Simulate real-time progress steps
    this.timer = setInterval(() => {
      if (this.statusStep < this.statuses.length - 1) {
        this.statusStep++;
        this.updateTrackingUI();
        if (window.showToast) {
          const cur = this.statuses[this.statusStep];
          window.showToast(`${cur.title}`, "info");
        }
      } else {
        clearInterval(this.timer);
        if (window.showToast) {
          window.showToast("Trip completed! You can now view and print your official GST tax invoice.", "success");
        }
      }
    }, 7000);
  }

  renderTrackingModal() {
    if (!this.currentTrip) return;
    const b = this.currentTrip;
    const d = b.driver;

    document.getElementById("tracking-trip-id").textContent = b.tripId;
    document.getElementById("tracking-otp").textContent = b.tripOtp;
    document.getElementById("tracking-route-label").textContent = `${b.origin} ➔ ${b.destination}`;
    document.getElementById("tracking-pickup-address").textContent = b.pickupAddress;
    document.getElementById("tracking-drop-address").textContent = b.dropAddress;
    document.getElementById("tracking-fare-total").textContent = `₹${b.fare.finalTotal.toLocaleString("en-IN")}`;
    document.getElementById("tracking-payment-method").textContent = b.paymentMethod;

    // Driver details
    document.getElementById("tracking-driver-avatar").textContent = d.avatar;
    document.getElementById("tracking-driver-name").textContent = d.name;
    document.getElementById("tracking-driver-badge").textContent = d.badge;
    document.getElementById("tracking-driver-rating").textContent = `★ ${d.rating} (${d.trips} trips)`;
    document.getElementById("tracking-car-details").textContent = `${d.carModel} • ${d.carNumber}`;
    document.getElementById("tracking-driver-languages").textContent = `Speaks: ${d.languages}`;

    this.updateTrackingUI();
  }

  updateTrackingUI() {
    const cur = this.statuses[this.statusStep];
    const statusTitle = document.getElementById("tracking-status-title");
    const statusSubtitle = document.getElementById("tracking-status-subtitle");
    const progressBar = document.getElementById("tracking-progress-bar-fill");
    const carIcon = document.getElementById("tracking-moving-car-icon");

    if (statusTitle) statusTitle.textContent = cur.title;
    if (statusSubtitle) statusSubtitle.textContent = cur.subtitle;
    if (progressBar) progressBar.style.width = `${cur.progress}%`;
    if (carIcon) carIcon.style.left = `${Math.min(cur.progress, 94)}%`;

    if (cur.code === "COMPLETED") {
      const invoiceBtn = document.getElementById("open-invoice-btn");
      if (invoiceBtn) invoiceBtn.style.display = "inline-flex";
    }
  }

  shareTripWhatsApp() {
    if (!this.currentTrip) return;
    const b = this.currentTrip;
    const text = encodeURIComponent(
      `*OneWayTaxiBihar Trip Details*\n` +
      `Trip ID: ${b.tripId}\n` +
      `Route: ${b.origin} to ${b.destination}\n` +
      `Captain: ${b.driver.name} (${b.driver.carNumber})\n` +
      `Car: ${b.driver.carModel}\n` +
      `OTP: ${b.tripOtp}\n` +
      `Total Fare: ₹${b.fare.finalTotal} (Fastag & GST incl.)\n` +
      `Status: Live Highway Ride in Progress • onewaytaxibihar.com`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
    if (window.showToast) {
      window.showToast("Opening WhatsApp with live trip details...", "info");
    }
  }

  triggerSOS() {
    if (window.showToast) {
      window.showToast("Emergency SOS Triggered: Bihar Police 112 alerted and GPS sent to Patrol Desk.", "error");
    }
    alert("EMERGENCY SOS ACTIVE\n\nBihar State Emergency Response Support System (ERSS-112) has been notified with your real-time highway GPS coordinates. OneWayTaxiBihar 24x7 Patna Emergency Safety Team is dialing your number.");
  }

  simulateCaptainCall() {
    if (!this.currentTrip) return;
    const driver = this.currentTrip.driver;
    if (window.showToast) {
      window.showToast(`Connecting to Captain ${driver.name} (${driver.phone})...`, "info");
    }
    alert(`Connecting via secure masked line to Captain ${driver.name} (${driver.phone})\n\n"Pranam Sir! Main 5 minute me aapke pickup location par pahunch raha hoon. AC on hai aur car sanitized hai."`);
  }

  openInvoiceModal() {
    if (!this.currentTrip) {
      const past = JSON.parse(localStorage.getItem("oneway_taxibihar_bookings") || "[]");
      if (past.length > 0) this.currentTrip = past[0];
      else {
        if (window.showToast) window.showToast("No active trip to generate invoice for.", "warning");
        return;
      }
    }

    const b = this.currentTrip;
    const f = b.fare;
    const modal = document.getElementById("gst-invoice-modal");
    if (!modal) return;

    // Fill Invoice Fields
    document.getElementById("inv-trip-id").textContent = b.tripId;
    document.getElementById("inv-date").textContent = new Date(b.createdAt || Date.now()).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    document.getElementById("inv-customer-name").textContent = b.passenger.name || "Commuter";
    document.getElementById("inv-customer-phone").textContent = b.passenger.phone || "+91 98XXX XXXXX";
    document.getElementById("inv-pickup-loc").textContent = `${b.origin} (${b.pickupAddress})`;
    document.getElementById("inv-drop-loc").textContent = `${b.destination} (${b.dropAddress})`;
    document.getElementById("inv-distance").textContent = `${f.distanceKm} km`;
    document.getElementById("inv-cab-type").textContent = `${b.cabCategory} (${b.driver.carModel})`;
    document.getElementById("inv-driver-name").textContent = `${b.driver.name} (Reg: ${b.driver.carNumber})`;

    // Financial Breakdown
    document.getElementById("inv-base-fare").textContent = `₹${f.baseCabCharge.toLocaleString("en-IN")}`;
    document.getElementById("inv-driver-allowance").textContent = `₹${f.driverAllowance}`;
    document.getElementById("inv-toll-tax").textContent = `₹${f.tollEst}`;
    document.getElementById("inv-discount").textContent = f.savings > 0 ? `-₹${f.savings}` : "₹0";
    document.getElementById("inv-gst").textContent = `₹${f.gstAmount}`;
    document.getElementById("inv-grand-total").textContent = `₹${f.finalTotal.toLocaleString("en-IN")}`;

    modal.classList.add("active");
  }

  printInvoice() {
    window.print();
  }
}
