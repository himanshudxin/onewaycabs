/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Unified Production Serverless REST API Handler for Vercel
 * OneWayTaxiBihar Mobility Pvt Ltd
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Resolve database path (supports local repo and Vercel /tmp)
const DB_LOCAL_PATH = path.join(process.cwd(), 'data', 'db.json');
const DB_TMP_PATH = '/tmp/db.json';

function getDbPath() {
  if (process.env.VERCEL) {
    if (!fs.existsSync(DB_TMP_PATH)) {
      if (fs.existsSync(DB_LOCAL_PATH)) {
        try {
          fs.copyFileSync(DB_LOCAL_PATH, DB_TMP_PATH);
        } catch (e) {
          console.warn('[DB] Failed to seed /tmp/db.json:', e.message);
        }
      }
    }
    return DB_TMP_PATH;
  }
  return DB_LOCAL_PATH;
}

// In-memory fallback for high-concurrency serverless execution
let memoryDb = null;

function loadDb() {
  try {
    const targetPath = getDbPath();
    if (fs.existsSync(targetPath)) {
      const data = fs.readFileSync(targetPath, 'utf8');
      memoryDb = JSON.parse(data);
      return memoryDb;
    }
  } catch (e) {
    console.warn('[DB] File read failed, using memory DB:', e.message);
  }

  if (!memoryDb) {
    memoryDb = {
      users: [],
      sessions: [],
      bookings: [],
      drivers: [
        {
          id: "drv_101",
          name: "Ramesh Kumar Sharma",
          phone: "+91 94310 12345",
          pin: "1234",
          vehicleNumber: "BR 01 PA 4921",
          vehicleModel: "Swift Dzire (White)",
          fleetTier: "sedan",
          rating: 4.9,
          totalTrips: 342,
          status: "Available"
        },
        {
          id: "drv_102",
          name: "Amit Kumar Singh",
          phone: "+91 98350 67890",
          pin: "5678",
          vehicleNumber: "BR 01 PB 7712",
          vehicleModel: "Maruti Ertiga (Silver)",
          fleetTier: "suv",
          rating: 4.85,
          totalTrips: 286,
          status: "Available"
        }
      ],
      payments: [],
      wallet_ledger: [],
      audit_logs: [],
      admins: [
        {
          id: "adm_01",
          username: "admin",
          passwordHash: "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918", // admin123
          name: "Patna Central Dispatch",
          role: "SUPER_ADMIN"
        }
      ],
      reviews: [],
      leads: []
    };
  }
  return memoryDb;
}

function saveDb(db) {
  memoryDb = db;
  try {
    const targetPath = getDbPath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.warn('[DB] File save failed (using in-memory):', e.message);
  }
}

// Distance Calculation Matrix for Major Bihar Routes
const BIHAR_DISTANCES = {
  "patna_gaya": 104,
  "patna_muzaffarpur": 75,
  "patna_darbhanga": 142,
  "patna_bhagalpur": 235,
  "patna_purnia": 305,
  "patna_rajgir": 102,
  "patna_ara": 54,
  "patna_buxar": 130,
  "patna_sasaram": 150,
  "patna_begusarai": 125,
  "patna_chhapra": 50,
  "patna_motihari": 155,
  "patna_bettiah": 200,
  "patna_siwan": 135,
  "patna_samastipur": 88,
  "patna_katihar": 320,
  "patna_saharsa": 210,
  "patna_munger": 178,
  "patna_kishanganj": 395,
  "patna_deoghar": 255,
  "patna_varanasi": 250,
  "patna_ranchi": 325,
  "patna_siliguri": 460
};

function getRouteDistance(origin, dest) {
  const normOrigin = (origin || "").toLowerCase().replace(/[^a-z]/g, "");
  const normDest = (dest || "").toLowerCase().replace(/[^a-z]/g, "");

  const key1 = `${normOrigin}_${normDest}`;
  const key2 = `${normDest}_${normOrigin}`;

  if (BIHAR_DISTANCES[key1]) return BIHAR_DISTANCES[key1];
  if (BIHAR_DISTANCES[key2]) return BIHAR_DISTANCES[key2];

  // Default fallback for intra/inter district
  if (normOrigin === normDest) return 35;
  return 120;
}

// Server-Side Fare Calculation Engine
const FLEET_RATES = {
  hatchback: { baseFare: 850, baseKm: 15, perKm: 21.0, name: "Go Hatchback", model: "WagonR, Tiago" },
  sedan: { baseFare: 1050, baseKm: 15, perKm: 25.0, name: "Prime Sedan", model: "Dzire, Etios, Amaze" },
  sedan_prime: { baseFare: 1350, baseKm: 15, perKm: 29.0, name: "Executive Sedan", model: "Honda City, Ciaz" },
  suv: { baseFare: 1650, baseKm: 15, perKm: 33.0, name: "Family SUV (6+1)", model: "Maruti Ertiga, Carens" }
};

function calculateServerFare(distanceKm, cabTier = 'sedan', tripType = 'oneway') {
  const tier = FLEET_RATES[cabTier] || FLEET_RATES.sedan;
  const effectiveKm = tripType === 'roundtrip' ? distanceKm * 2 : distanceKm;
  const extraKm = Math.max(0, effectiveKm - tier.baseKm);

  let baseCharge = tier.baseFare + (extraKm * tier.perKm);
  if (tripType === 'roundtrip') {
    baseCharge = Math.round(baseCharge * 0.88); // 12% roundtrip discount
  }

  const tollEst = Math.round((distanceKm / 70) * 55);
  const driverAllowance = (tripType === 'roundtrip' || distanceKm > 200) ? 350 : 0;
  const subtotal = baseCharge + tollEst + driverAllowance;
  const gst = Math.round(subtotal * 0.05);
  const totalFare = subtotal + gst;

  return {
    distanceKm,
    duration: `${Math.floor(distanceKm / 45)}h ${Math.round((distanceKm % 45) * 1.3)}m`,
    tierId: cabTier,
    tierName: tier.name,
    tierModel: tier.model,
    baseFare: Math.round(baseCharge),
    tollFastag: tollEst,
    driverAllowance,
    gst,
    totalFare: Math.round(totalFare)
  };
}

// Security: Password Hashing & Token Generation
function hashPassword(pass) {
  return crypto.createHash('sha256').update(pass).digest('hex');
}

function generateToken(prefix = 'otb') {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

// Session Validator
function getSessionUser(req, db) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = (db.sessions || []).find(s => s.token === token);
  if (!session) return null;

  const user = (db.users || []).find(u => u.id === session.userId || u.phone === session.phone);
  return user ? { user, session } : null;
}

function getSessionAdmin(req, db) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = (db.sessions || []).find(s => s.token === token && s.role === 'admin');
  return session || null;
}

function getSessionDriver(req, db) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

  const session = (db.sessions || []).find(s => s.token === token && s.role === 'driver');
  if (!session) return null;

  const driver = (db.drivers || []).find(d => d.id === session.driverId);
  return driver ? { driver, session } : null;
}

// Main Request Handler
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/^\/api/, '');
  const method = req.method.toUpperCase();

  // Parse JSON Body
  let body = {};
  if (method === 'POST' || method === 'PUT') {
    try {
      if (req.body && typeof req.body === 'object') {
        body = req.body;
      } else if (typeof req.body === 'string') {
        body = JSON.parse(req.body);
      } else {
        const buffers = [];
        for await (const chunk of req) buffers.push(chunk);
        const data = Buffer.concat(buffers).toString();
        body = data ? JSON.parse(data) : {};
      }
    } catch (e) {
      body = {};
    }
  }

  const db = loadDb();

  const sendJson = (status, data) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  };

  try {
    // -------------------------------------------------------------
    // 1. HEALTHCHECK
    // -------------------------------------------------------------
    if (pathname === '/health' && method === 'GET') {
      return sendJson(200, {
        status: 'ONLINE',
        platform: 'OneWayTaxiBihar Production API',
        domain: 'onewaytaxibihar.com',
        time: new Date().toISOString(),
        helpline: '+91 80021 41816',
        whatsapp: '+91 72818 51011'
      });
    }

    // -------------------------------------------------------------
    // 2. PASSENGER AUTH (Direct Login - Name + Phone, Zero OTP)
    // -------------------------------------------------------------
    if (pathname === '/auth/login' && method === 'POST') {
      const cleanPhone = (body.phone || '').replace(/\D/g, '').slice(-10);
      const cleanName = (body.name || '').trim();

      if (!cleanPhone || cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
        return sendJson(400, { success: false, message: 'Invalid phone number. Please provide a valid 10-digit Indian mobile number starting with 6-9.' });
      }
      if (!cleanName || cleanName.length < 2 || cleanName.length > 60) {
        return sendJson(400, { success: false, message: 'Passenger name is required (2 to 60 characters).' });
      }

      let user = (db.users || []).find(u => u.phone.replace(/\D/g, '').slice(-10) === cleanPhone);

      if (!user) {
        // Create new customer account with ₹100 Welcome Bonus
        user = {
          id: `usr_${cleanPhone}`,
          name: cleanName,
          phone: `+91 ${cleanPhone}`,
          email: (body.email || '').trim().toLowerCase(),
          walletBalance: 100,
          memberSince: new Date().getFullYear().toString(),
          createdAt: new Date().toISOString()
        };
        db.users.push(user);

        // Record in Wallet Ledger
        db.wallet_ledger.push({
          id: `WLT_${Date.now()}_${Math.floor(Math.random()*1000)}`,
          userId: user.id,
          phone: user.phone,
          type: 'CREDIT',
          amount: 100,
          balanceAfter: 100,
          description: 'Welcome Bonus Credit',
          createdAt: new Date().toISOString()
        });
      } else {
        // Update name if supplied and valid
        if (cleanName && cleanName !== 'Valued Passenger') {
          user.name = cleanName;
        }
      }

      // Create Secure Session Token
      const token = generateToken('otb_sess');
      if (!db.sessions) db.sessions = [];
      db.sessions.push({
        token,
        userId: user.id,
        phone: user.phone,
        role: 'customer',
        createdAt: new Date().toISOString()
      });

      saveDb(db);

      return sendJson(200, {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          walletBalance: user.walletBalance
        }
      });
    }

    // -------------------------------------------------------------
    // 2B. PASSENGER LOGOUT (Session Invalidation)
    // -------------------------------------------------------------
    if (pathname === '/auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token && db.sessions) {
        db.sessions = db.sessions.filter(s => s.token !== token);
        saveDb(db);
      }
      return sendJson(200, { success: true, message: 'Logged out successfully' });
    }

    // -------------------------------------------------------------
    // 3. GET CURRENT USER PROFILE (Server-Verified)
    // -------------------------------------------------------------
    if (pathname === '/user/profile' && method === 'GET') {
      const auth = getSessionUser(req, db);
      if (!auth) {
        return sendJson(401, { success: false, message: 'Unauthorized session' });
      }
      return sendJson(200, {
        success: true,
        user: {
          id: auth.user.id,
          name: auth.user.name,
          phone: auth.user.phone,
          email: auth.user.email,
          walletBalance: auth.user.walletBalance || 0
        }
      });
    }

    // -------------------------------------------------------------
    // 4. SERVER-SIDE FARE CALCULATION
    // -------------------------------------------------------------
    if (pathname === '/fares/calculate' && method === 'POST') {
      const { origin, dest, cabTier, tripType } = body;
      const distanceKm = getRouteDistance(origin, dest);
      const fareData = calculateServerFare(distanceKm, cabTier, tripType);
      return sendJson(200, { success: true, fare: fareData });
    }

    // -------------------------------------------------------------
    // 5. CUSTOMER BOOKINGS (Strict Data Isolation)
    // -------------------------------------------------------------
    if (pathname === '/bookings' && method === 'GET') {
      const auth = getSessionUser(req, db);
      if (!auth) {
        // Unauthenticated customers see empty list (Zero leakage)
        return sendJson(200, { success: true, count: 0, bookings: [] });
      }

      const cleanUserPhone = auth.user.phone.replace(/\D/g, '').slice(-10);
      const customerBookings = (db.bookings || []).filter(b => 
        b.customerId === auth.user.id || 
        (b.passengerPhone && b.passengerPhone.replace(/\D/g, '').slice(-10) === cleanUserPhone)
      );

      // Mask driver details if booking is still in REQUESTED state
      const sanitized = customerBookings.map(b => {
        if (b.bookingStatus === 'REQUESTED' || b.bookingStatus === 'PENDING CONFIRMATION') {
          return {
            ...b,
            driverDetails: null,
            partnerNotice: "Our partner/driver or agent will call you in 5 minutes to confirm booking."
          };
        }
        return b;
      });

      return sendJson(200, {
        success: true,
        count: sanitized.length,
        bookings: sanitized
      });
    }

    // -------------------------------------------------------------
    // 6. CREATE BOOKING REQUEST (REQUESTED Status & Server Fare Lock)
    // -------------------------------------------------------------
    if (pathname === '/bookings' && method === 'POST') {
      const {
        originCity,
        destCity,
        pickupDate,
        pickupTime,
        cabTier,
        passengerName,
        passengerPhone,
        passengerEmail,
        pickupAddress,
        dropAddress,
        paymentMethod,
        useWallet
      } = body;

      const cleanPhone = (passengerPhone || '').replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length < 10) {
        return sendJson(400, { success: false, message: 'Valid 10-digit mobile number required' });
      }
      if (!passengerName || passengerName.trim().length < 2) {
        return sendJson(400, { success: false, message: 'Passenger name required' });
      }

      // Server-side distance and fare recalculation (tamper-proof)
      const distanceKm = getRouteDistance(originCity, destCity);
      const serverFare = calculateServerFare(distanceKm, cabTier || 'sedan', 'oneway');
      const baseTotal = serverFare.totalFare;

      // Find or create customer
      let user = (db.users || []).find(u => u.phone.replace(/\D/g, '').slice(-10) === cleanPhone);
      if (!user) {
        user = {
          id: `usr_${cleanPhone}`,
          name: passengerName.trim(),
          phone: `+91 ${cleanPhone}`,
          email: passengerEmail || '',
          walletBalance: 100,
          createdAt: new Date().toISOString()
        };
        db.users.push(user);
      }

      // Handle atomic wallet deduction
      let walletDeducted = 0;
      if (useWallet && user.walletBalance > 0) {
        walletDeducted = Math.min(user.walletBalance, 100);
        user.walletBalance -= walletDeducted;

        db.wallet_ledger.push({
          id: `WLT_${Date.now()}`,
          userId: user.id,
          phone: user.phone,
          type: 'DEBIT',
          amount: walletDeducted,
          balanceAfter: user.walletBalance,
          description: `Applied to Booking ${originCity} to ${destCity}`,
          createdAt: new Date().toISOString()
        });
      }

      const finalPayable = Math.max(0, baseTotal - walletDeducted);
      const bookingId = `OTB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const newBooking = {
        bookingId,
        customerId: user.id,
        passengerName: passengerName.trim(),
        passengerPhone: `+91 ${cleanPhone}`,
        passengerEmail: passengerEmail || '',
        originCity: originCity || 'Patna',
        destCity: destCity || 'Gaya',
        pickupAddress: pickupAddress || `${originCity || 'Patna'} City`,
        dropAddress: dropAddress || `${destCity || 'Gaya'} City`,
        pickupDate: pickupDate || new Date().toISOString().split('T')[0],
        pickupTime: pickupTime || '10:00 AM',
        distanceKm,
        duration: serverFare.duration,
        fleetClass: serverFare.tierName,
        fleetModel: serverFare.tierModel,
        fareBreakdown: serverFare,
        totalFare: finalPayable,
        originalFare: baseTotal,
        walletUsed: walletDeducted,
        paymentMethod: paymentMethod || 'UPI / PhonePe QR Code',
        paymentStatus: (paymentMethod === 'Cash / UPI to Driver') ? 'PENDING (Cash on Arrival)' : 'PAYMENT INITIATED (UPI QR)',
        bookingStatus: 'REQUESTED',
        partnerNotice: 'Our partner/driver or agent will call you in 5 minutes to confirm booking.',
        driverDetails: null, // Zero driver details before real manual assignment!
        statusHistory: [
          {
            status: 'REQUESTED',
            timestamp: new Date().toISOString(),
            actor: 'Customer',
            note: 'Booking request placed. Agent call in 5 mins.'
          }
        ],
        createdAt: new Date().toISOString()
      };

      if (!db.bookings) db.bookings = [];
      db.bookings.unshift(newBooking);

      // Audit Log
      db.audit_logs.push({
        id: `AUD_${Date.now()}`,
        entity: 'BOOKING',
        entityId: bookingId,
        action: 'CREATE_REQUEST',
        actor: user.phone,
        details: `${originCity} → ${destCity} for ₹${finalPayable}`,
        createdAt: new Date().toISOString()
      });

      saveDb(db);

      return sendJson(201, {
        success: true,
        booking: newBooking,
        message: 'Booking request received! Our partner/agent will call you within 5 minutes.'
      });
    }

    // -------------------------------------------------------------
    // 7. CANCEL BOOKING
    // -------------------------------------------------------------
    if (pathname === '/bookings/cancel' && method === 'POST') {
      const { bookingId } = body;
      const booking = (db.bookings || []).find(b => b.bookingId === bookingId);
      if (!booking) {
        return sendJson(404, { success: false, message: 'Booking not found' });
      }

      booking.bookingStatus = 'CANCELLED';
      booking.statusHistory.push({
        status: 'CANCELLED',
        timestamp: new Date().toISOString(),
        actor: 'Customer',
        note: 'Cancelled by customer (₹0 fee)'
      });

      // Refund wallet deduction if used
      if (booking.walletUsed > 0) {
        const user = (db.users || []).find(u => u.id === booking.customerId);
        if (user) {
          user.walletBalance = (user.walletBalance || 0) + booking.walletUsed;
          db.wallet_ledger.push({
            id: `WLT_${Date.now()}`,
            userId: user.id,
            phone: user.phone,
            type: 'REFUND',
            amount: booking.walletUsed,
            balanceAfter: user.walletBalance,
            description: `Refund for Cancelled Booking ${bookingId}`,
            createdAt: new Date().toISOString()
          });
        }
      }

      saveDb(db);
      return sendJson(200, { success: true, message: 'Booking cancelled successfully with ₹0 fee' });
    }

    // -------------------------------------------------------------
    // 8. WALLET TRANSACTION LEDGER
    // -------------------------------------------------------------
    if (pathname === '/wallet/ledger' && method === 'GET') {
      const auth = getSessionUser(req, db);
      if (!auth) {
        return sendJson(401, { success: false, message: 'Unauthorized' });
      }
      const transactions = (db.wallet_ledger || []).filter(t => t.userId === auth.user.id);
      return sendJson(200, {
        success: true,
        balance: auth.user.walletBalance || 0,
        transactions
      });
    }

    // -------------------------------------------------------------
    // 9. ADMIN AUTH & DISPATCH APIS
    // -------------------------------------------------------------
    if (pathname === '/admin/login' && method === 'POST') {
      const { username, password } = body;
      const passHash = hashPassword(password || '');
      const admin = (db.admins || []).find(a => a.username === username && a.passwordHash === passHash);

      if (!admin) {
        return sendJson(401, { success: false, message: 'Invalid admin credentials' });
      }

      const token = generateToken('adm_sess');
      if (!db.sessions) db.sessions = [];
      db.sessions.push({
        token,
        adminId: admin.id,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      saveDb(db);

      return sendJson(200, {
        success: true,
        token,
        admin: { id: admin.id, username: admin.username, name: admin.name }
      });
    }

    if (pathname === '/admin/bookings' && method === 'GET') {
      const admin = getSessionAdmin(req, db);
      if (!admin) return sendJson(401, { success: false, message: 'Admin authentication required' });

      return sendJson(200, {
        success: true,
        bookings: db.bookings || []
      });
    }

    if (pathname === '/admin/confirm' && method === 'POST') {
      const admin = getSessionAdmin(req, db);
      if (!admin) return sendJson(401, { success: false, message: 'Admin authentication required' });

      const { bookingId } = body;
      const booking = (db.bookings || []).find(b => b.bookingId === bookingId);
      if (!booking) return sendJson(404, { success: false, message: 'Booking not found' });

      booking.bookingStatus = 'CONFIRMED';
      booking.statusHistory.push({
        status: 'CONFIRMED',
        timestamp: new Date().toISOString(),
        actor: 'Admin Dispatcher',
        note: 'Customer called and booking confirmed manually.'
      });

      saveDb(db);
      return sendJson(200, { success: true, booking });
    }

    if (pathname === '/admin/assign-driver' && method === 'POST') {
      const admin = getSessionAdmin(req, db);
      if (!admin) return sendJson(401, { success: false, message: 'Admin authentication required' });

      const { bookingId, driverId } = body;
      const booking = (db.bookings || []).find(b => b.bookingId === bookingId);
      const driver = (db.drivers || []).find(d => d.id === driverId);

      if (!booking || !driver) {
        return sendJson(404, { success: false, message: 'Booking or driver not found' });
      }

      booking.assignedDriverId = driver.id;
      booking.driverDetails = {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicleNumber: driver.vehicleNumber,
        vehicleModel: driver.vehicleModel,
        rating: driver.rating
      };
      booking.bookingStatus = 'DRIVER ASSIGNED';
      booking.statusHistory.push({
        status: 'DRIVER ASSIGNED',
        timestamp: new Date().toISOString(),
        actor: 'Admin Dispatcher',
        note: `Driver assigned: ${driver.name} (${driver.vehicleNumber})`
      });

      saveDb(db);
      return sendJson(200, { success: true, booking });
    }

    if (pathname === '/admin/verify-payment' && method === 'POST') {
      const admin = getSessionAdmin(req, db);
      if (!admin) return sendJson(401, { success: false, message: 'Admin authentication required' });

      const { bookingId, txnRef } = body;
      const booking = (db.bookings || []).find(b => b.bookingId === bookingId);
      if (!booking) return sendJson(404, { success: false, message: 'Booking not found' });

      booking.paymentStatus = 'PAID (Verified by Admin)';
      booking.paymentTxnRef = txnRef || `UPI-VER-${Date.now()}`;
      booking.statusHistory.push({
        status: booking.bookingStatus,
        timestamp: new Date().toISOString(),
        actor: 'Admin Finance',
        note: `Payment verified for ₹${booking.totalFare}. Txn: ${booking.paymentTxnRef}`
      });

      saveDb(db);
      return sendJson(200, { success: true, booking });
    }

    if (pathname === '/admin/drivers' && method === 'GET') {
      const admin = getSessionAdmin(req, db);
      if (!admin) return sendJson(401, { success: false, message: 'Admin authentication required' });
      return sendJson(200, { success: true, drivers: db.drivers || [] });
    }

    // -------------------------------------------------------------
    // 10. DRIVER PARTNER APIS
    // -------------------------------------------------------------
    if (pathname === '/driver/login' && method === 'POST') {
      const { phone, pin } = body;
      const cleanPhone = (phone || '').replace(/\D/g, '').slice(-10);
      const driver = (db.drivers || []).find(d => 
        d.phone.replace(/\D/g, '').slice(-10) === cleanPhone && d.pin === pin
      );

      if (!driver) {
        return sendJson(401, { success: false, message: 'Invalid Driver Phone or PIN' });
      }

      const token = generateToken('drv_sess');
      if (!db.sessions) db.sessions = [];
      db.sessions.push({
        token,
        driverId: driver.id,
        role: 'driver',
        createdAt: new Date().toISOString()
      });
      saveDb(db);

      return sendJson(200, {
        success: true,
        token,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehicleNumber: driver.vehicleNumber,
          vehicleModel: driver.vehicleModel,
          rating: driver.rating
        }
      });
    }

    if (pathname === '/driver/trips' && method === 'GET') {
      const driverAuth = getSessionDriver(req, db);
      if (!driverAuth) return sendJson(401, { success: false, message: 'Driver authentication required' });

      const assignedTrips = (db.bookings || []).filter(b => b.assignedDriverId === driverAuth.driver.id);
      return sendJson(200, { success: true, trips: assignedTrips });
    }

    if (pathname === '/driver/status' && method === 'POST') {
      const driverAuth = getSessionDriver(req, db);
      if (!driverAuth) return sendJson(401, { success: false, message: 'Driver authentication required' });

      const { bookingId, newStatus } = body;
      const allowedStatuses = ['ACCEPTED', 'ON THE WAY', 'ARRIVED', 'TRIP STARTED', 'COMPLETED'];
      if (!allowedStatuses.includes(newStatus)) {
        return sendJson(400, { success: false, message: 'Invalid driver status' });
      }

      const booking = (db.bookings || []).find(b => b.bookingId === bookingId && b.assignedDriverId === driverAuth.driver.id);
      if (!booking) return sendJson(404, { success: false, message: 'Trip not found or not assigned to you' });

      booking.bookingStatus = newStatus;
      booking.statusHistory.push({
        status: newStatus,
        timestamp: new Date().toISOString(),
        actor: `Driver ${driverAuth.driver.name}`,
        note: `Driver updated status to ${newStatus}`
      });

      saveDb(db);
      return sendJson(200, { success: true, booking });
    }

    // Default 404 for unknown API routes
    return sendJson(404, { success: false, message: 'API route not found' });

  } catch (err) {
    console.error('[API Error]:', err);
    return sendJson(500, { success: false, message: 'Internal server error', error: err.message });
  }
};
