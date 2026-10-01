/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Enterprise Unified Database Service
 * Real-World MongoDB Atlas & PostgreSQL Service with Zero-Downtime Hot Local Fallback
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DB_LOCAL_PATH = path.join(process.cwd(), 'data', 'db.json');
const DB_TMP_PATH = '/tmp/db.json';

const ALL_COLLECTIONS = [
  'bookings',
  'drivers',
  'driver_applications',
  'users',
  'vehicles',
  'payments',
  'wallet_ledger',
  'leads',
  'notifications',
  'coupons',
  'audit_logs',
  'sessions',
  'settings'
];

function getLocalDbPath() {
  if (process.env.VERCEL) {
    if (!fs.existsSync(DB_TMP_PATH) && fs.existsSync(DB_LOCAL_PATH)) {
      try {
        fs.copyFileSync(DB_LOCAL_PATH, DB_TMP_PATH);
      } catch (e) {
        console.warn('[DB] Failed to seed /tmp/db.json:', e.message);
      }
    }
    return DB_TMP_PATH;
  }
  return DB_LOCAL_PATH;
}

// In-Memory Database Cache
let memoryDb = null;
let mongoClient = null;
let mongoDbInstance = null;
let pgPool = null;
let activeEngine = 'local'; // 'mongodb' | 'postgres' | 'local'
let isDbConnected = false;
let retryInterval = null;

// 1. Initial Local DB Loader
function loadLocalDb() {
  try {
    const targetPath = getLocalDbPath();
    if (fs.existsSync(targetPath)) {
      const data = fs.readFileSync(targetPath, 'utf8').replace(/^\uFEFF/, '');
      memoryDb = JSON.parse(data);
      return memoryDb;
    }
  } catch (e) {
    console.warn('[DB] File read failed, using memory fallback:', e.message);
  }

  if (!memoryDb) {
    memoryDb = {
      users: [],
      sessions: [],
      bookings: [],
      drivers: [],
      driver_applications: [],
      vehicles: [],
      payments: [],
      wallet_ledger: [],
      leads: [],
      notifications: [],
      audit_logs: [],
      admins: [],
      coupons: [],
      settings: {}
    };
  }
  return memoryDb;
}

// 2. PostgreSQL Connection & Schema Initialization
async function initPostgres() {
  const pgUri = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!pgUri) return false;

  try {
    const { Pool } = require('pg');
    pgPool = new Pool({
      connectionString: pgUri,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000
    });

    const client = await pgPool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS oneway_documents (
        collection_name VARCHAR(64) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    activeEngine = 'postgres';
    isDbConnected = true;
    console.log('[Database Service] ✅ Connected to PostgreSQL Database');
    return true;
  } catch (err) {
    console.warn('[Database Service] PostgreSQL connection notice:', err.message);
    pgPool = null;
    return false;
  }
}

// 3. Real-World MongoDB Atlas Connection Initialization
async function initMongo() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return false;

  try {
    const { MongoClient, ServerApiVersion } = require('mongodb');
    
    // Connection options for maximum cloud reliability across Node versions & Atlas
    const clientOptions = {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 8000,
      maxPoolSize: 20,
      minPoolSize: 2,
      retryWrites: true,
      retryReads: true
    };

    mongoClient = new MongoClient(mongoUri, clientOptions);
    await mongoClient.connect();

    // Verify ping to ensure cluster is reachable
    const dbName = process.env.MONGODB_DB_NAME || 'onewaytaxibihar';
    mongoDbInstance = mongoClient.db(dbName);
    await mongoDbInstance.command({ ping: 1 });

    activeEngine = 'mongodb';
    isDbConnected = true;
    console.log(`[Database Service] 🚀 ✅ Connected to MongoDB Atlas Cloud (${dbName})`);

    // Create essential indexes for real-world high speed
    try {
      await mongoDbInstance.collection('bookings').createIndex({ bookingId: 1 }, { unique: true, sparse: true });
      await mongoDbInstance.collection('bookings').createIndex({ passengerPhone: 1 });
      await mongoDbInstance.collection('drivers').createIndex({ phone: 1 });
      await mongoDbInstance.collection('users').createIndex({ phone: 1 });
      await mongoDbInstance.collection('leads').createIndex({ cleanPhone: 1 });
      await mongoDbInstance.collection('payments').createIndex({ bookingId: 1 });
    } catch (idxErr) {
      // Non-fatal
    }

    return true;
  } catch (err) {
    console.warn('[Database Service] MongoDB Atlas notice:', err.message);
    if (err.message.includes('SSL routines') || err.message.includes('alert') || err.message.includes('whitelist') || err.message.includes('timed out')) {
      console.warn('[Database Service] 💡 Real-World Setup: In MongoDB Atlas Dashboard ➔ "Network Access" ➔ Add IP Address ➔ Select "Allow Access from Anywhere (0.0.0.0/0)".');
    }
    mongoClient = null;
    mongoDbInstance = null;
    isDbConnected = false;
    return false;
  }
}

// 4. Primary Initializer
async function initDatabase() {
  loadLocalDb();

  // Try MongoDB Atlas first for real-world persistence, or PostgreSQL if configured
  let ok = await initMongo();
  if (!ok) {
    ok = await initPostgres();
  }

  if (ok && isDbConnected) {
    await pullFromRemoteCloud();
    // Also push any local initial seed data to MongoDB if MongoDB is clean
    await seedRemoteIfEmpty();
  } else {
    activeEngine = 'local';
    console.log('[Database Service] ℹ️ Using persistent local storage (data/db.json). Ready for production database attach.');
    
    // Auto-retry in background every 45 seconds without blocking
    if (!retryInterval) {
      retryInterval = setInterval(async () => {
        if (!isDbConnected && process.env.MONGODB_URI) {
          const reconnected = await initMongo();
          if (reconnected) {
            clearInterval(retryInterval);
            retryInterval = null;
            await pullFromRemoteCloud();
            await seedRemoteIfEmpty();
          }
        }
      }, 45000);
    }
  }

  return { engine: activeEngine, connected: isDbConnected };
}

// 5. Remote Sync Operations
async function pullFromRemoteCloud() {
  try {
    if (activeEngine === 'mongodb' && mongoDbInstance) {
      for (const colName of ALL_COLLECTIONS) {
        if (colName === 'settings') {
          const doc = await mongoDbInstance.collection('settings').findOne({ id: 'global_settings' });
          if (doc) {
            const { _id, ...rest } = doc;
            memoryDb.settings = rest;
          }
        } else {
          const docs = await mongoDbInstance.collection(colName).find({}).toArray();
          if (docs && docs.length > 0) {
            memoryDb[colName] = docs.map(({ _id, ...rest }) => rest);
          }
        }
      }
      console.log(`[Database Service] Remote MongoDB records hydrated into memory.`);
    } else if (activeEngine === 'postgres' && pgPool) {
      const res = await pgPool.query('SELECT collection_name, data FROM oneway_documents');
      for (const row of res.rows) {
        memoryDb[row.collection_name] = row.data;
      }
      console.log(`[Database Service] Remote PostgreSQL records hydrated into memory.`);
    }
  } catch (err) {
    console.warn('[Database Service] Pull from cloud warning:', err.message);
  }
}

async function seedRemoteIfEmpty() {
  try {
    if (activeEngine === 'mongodb' && mongoDbInstance && memoryDb) {
      const count = await mongoDbInstance.collection('bookings').countDocuments();
      if (count === 0 && Array.isArray(memoryDb.bookings) && memoryDb.bookings.length > 0) {
        console.log('[Database Service] Seeding initial database records to MongoDB Atlas...');
        await syncToRemoteCloud(memoryDb);
        console.log('[Database Service] ✅ MongoDB Atlas seeded successfully!');
      }
    }
  } catch (e) {
    console.warn('[Database Service] Seeding note:', e.message);
  }
}

async function syncToRemoteCloud(db) {
  try {
    if (activeEngine === 'mongodb' && mongoDbInstance) {
      // 1. Bookings
      if (Array.isArray(db.bookings)) {
        for (const b of db.bookings) {
          const bId = b.bookingId || b.id;
          if (bId) await mongoDbInstance.collection('bookings').updateOne({ bookingId: bId }, { $set: { ...b, bookingId: bId } }, { upsert: true });
        }
      }
      // 2. Drivers
      if (Array.isArray(db.drivers)) {
        for (const d of db.drivers) {
          const dId = d.id || d.phone;
          if (dId) await mongoDbInstance.collection('drivers').updateOne({ id: dId }, { $set: { ...d, id: dId } }, { upsert: true });
        }
      }
      // 3. Driver Applications
      if (Array.isArray(db.driver_applications)) {
        for (const da of db.driver_applications) {
          const daId = da.id || da.phone;
          if (daId) await mongoDbInstance.collection('driver_applications').updateOne({ id: daId }, { $set: { ...da, id: daId } }, { upsert: true });
        }
      }
      // 4. Users
      if (Array.isArray(db.users)) {
        for (const u of db.users) {
          if (u.id) await mongoDbInstance.collection('users').updateOne({ id: u.id }, { $set: u }, { upsert: true });
        }
      }
      // 5. Leads
      if (Array.isArray(db.leads)) {
        for (const l of db.leads) {
          if (l.id) await mongoDbInstance.collection('leads').updateOne({ id: l.id }, { $set: l }, { upsert: true });
        }
      }
      // 6. Payments
      if (Array.isArray(db.payments)) {
        for (const p of db.payments) {
          const pId = p.id || p.orderId || p.paymentId;
          if (pId) await mongoDbInstance.collection('payments').updateOne({ id: pId }, { $set: p }, { upsert: true });
        }
      }
      // 7. Wallet Ledger
      if (Array.isArray(db.wallet_ledger)) {
        for (const w of db.wallet_ledger) {
          if (w.id) await mongoDbInstance.collection('wallet_ledger').updateOne({ id: w.id }, { $set: w }, { upsert: true });
        }
      }
      // 8. Notifications
      if (Array.isArray(db.notifications)) {
        for (const n of db.notifications) {
          if (n.id) await mongoDbInstance.collection('notifications').updateOne({ id: n.id }, { $set: n }, { upsert: true });
        }
      }
      // 9. Vehicles
      if (Array.isArray(db.vehicles)) {
        for (const v of db.vehicles) {
          if (v.id) await mongoDbInstance.collection('vehicles').updateOne({ id: v.id }, { $set: v }, { upsert: true });
        }
      }
      // 10. Coupons
      if (Array.isArray(db.coupons)) {
        for (const c of db.coupons) {
          if (c.code) await mongoDbInstance.collection('coupons').updateOne({ code: c.code }, { $set: c }, { upsert: true });
        }
      }
      // 11. Settings
      if (db.settings) {
        await mongoDbInstance.collection('settings').updateOne({ id: 'global_settings' }, { $set: { ...db.settings, id: 'global_settings' } }, { upsert: true });
      }
    } else if (activeEngine === 'postgres' && pgPool) {
      for (const col of ALL_COLLECTIONS) {
        if (db[col]) {
          await pgPool.query(`
            INSERT INTO oneway_documents (collection_name, data, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (collection_name)
            DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP;
          `, [col, JSON.stringify(db[col])]);
        }
      }
    }
  } catch (err) {
    console.warn('[Database Service] Async remote push note:', err.message);
  }
}

// 6. Public CRUD and Database State Functions
function getDb() {
  if (!memoryDb) {
    loadLocalDb();
  }
  return memoryDb;
}

function saveDb(data) {
  memoryDb = data;
  try {
    const targetPath = getLocalDbPath();
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[DB] Local save failed:', e.message);
  }

  // Push to MongoDB Atlas / PostgreSQL asynchronously
  syncToRemoteCloud(data).catch(() => {});
}

// Atomic Booking Operations
async function createBooking(booking) {
  const db = getDb();
  if (!db.bookings) db.bookings = [];
  
  // Deduplication check: 15-second window
  const now = Date.now();
  const duplicate = db.bookings.find(b => {
    if (b.passengerPhone === booking.passengerPhone &&
        b.pickupCity === booking.pickupCity &&
        b.dropCity === booking.dropCity &&
        b.bookingStatus !== 'CANCELLED') {
      const diff = now - new Date(b.createdAt || 0).getTime();
      return diff < 15000;
    }
    return false;
  });

  if (duplicate) {
    return { booking: duplicate, deduplicated: true };
  }

  db.bookings.unshift(booking);
  saveDb(db);
  return { booking, deduplicated: false };
}

async function findBooking(bookingId) {
  const db = getDb();
  return (db.bookings || []).find(b => b.bookingId === bookingId || b.id === bookingId) || null;
}

async function updateBooking(bookingId, patch) {
  const db = getDb();
  const idx = (db.bookings || []).findIndex(b => b.bookingId === bookingId || b.id === bookingId);
  if (idx === -1) return null;

  db.bookings[idx] = { ...db.bookings[idx], ...patch, updatedAt: new Date().toISOString() };
  saveDb(db);
  return db.bookings[idx];
}

async function recordPayment(payment) {
  const db = getDb();
  if (!db.payments) db.payments = [];
  const idx = db.payments.findIndex(p => p.orderId === payment.orderId || p.paymentId === payment.paymentId);
  if (idx >= 0) {
    db.payments[idx] = { ...db.payments[idx], ...payment, updatedAt: new Date().toISOString() };
  } else {
    db.payments.unshift({ ...payment, createdAt: new Date().toISOString() });
  }
  saveDb(db);
  return payment;
}

async function addAuditLog(action, actor, details) {
  const db = getDb();
  if (!db.audit_logs) db.audit_logs = [];
  const logEntry = {
    id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    action,
    actor: actor || 'SYSTEM',
    details,
    timestamp: new Date().toISOString()
  };
  db.audit_logs.unshift(logEntry);
  if (db.audit_logs.length > 500) db.audit_logs.pop();
  saveDb(db);
  return logEntry;
}

function getDatabaseStatus() {
  return {
    engine: activeEngine,
    connected: isDbConnected,
    hasMongoUri: !!process.env.MONGODB_URI,
    hasPostgresUri: !!(process.env.DATABASE_URL || process.env.POSTGRES_URL),
    totalBookings: (memoryDb?.bookings || []).length,
    totalDrivers: (memoryDb?.drivers || []).length,
    totalUsers: (memoryDb?.users || []).length,
    totalLeads: (memoryDb?.leads || []).length
  };
}

module.exports = {
  initDatabase,
  getDb,
  saveDb,
  createBooking,
  findBooking,
  updateBooking,
  recordPayment,
  addAuditLog,
  getDatabaseStatus
};
