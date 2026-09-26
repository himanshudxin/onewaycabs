/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Enterprise Unified Database Service
 * Supports MongoDB Atlas & PostgreSQL (Supabase / Neon / AWS RDS) with Zero-Downtime Local Fallback
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const DB_LOCAL_PATH = path.join(process.cwd(), 'data', 'db.json');
const DB_TMP_PATH = '/tmp/db.json';

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
let pgPool = null;
let activeEngine = 'local'; // 'mongodb' | 'postgres' | 'local'
let isDbConnected = false;

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
      vehicles: [],
      payments: [],
      wallet_ledger: [],
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
    // Auto-create document/relational tables if not present
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
    console.log('[Database Service] ✅ Connected to PostgreSQL (Supabase/Neon/RDS)');
    return true;
  } catch (err) {
    console.warn('[Database Service] PostgreSQL connection notice:', err.message);
    pgPool = null;
    return false;
  }
}

// 3. MongoDB Atlas Connection Initialization
async function initMongo() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return false;

  try {
    const { MongoClient } = require('mongodb');
    mongoClient = new MongoClient(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      tlsAllowInvalidCertificates: true
    });
    await mongoClient.connect();
    activeEngine = 'mongodb';
    isDbConnected = true;
    console.log('[Database Service] ✅ Connected to MongoDB Atlas Cloud');
    return true;
  } catch (err) {
    console.warn('[Database Service] MongoDB Atlas notice:', err.message);
    if (err.message.includes('SSL routines') || err.message.includes('alert')) {
      console.warn('[Database Service] 💡 Tip: In MongoDB Atlas dashboard, add 0.0.0.0/0 to "Network Access" to allow cloud & local connections.');
    }
    mongoClient = null;
    return false;
  }
}

// 4. Primary Initializer
async function initDatabase() {
  loadLocalDb();

  // Try PostgreSQL first if configured, else MongoDB Atlas
  let ok = await initPostgres();
  if (!ok) {
    ok = await initMongo();
  }

  if (ok && isDbConnected) {
    await pullFromRemoteCloud();
  } else {
    activeEngine = 'local';
    console.log('[Database Service] ℹ️ Using persistent local storage (data/db.json). Ready for production database attach.');
  }

  return { engine: activeEngine, connected: isDbConnected };
}

// 5. Remote Sync Operations
async function pullFromRemoteCloud() {
  try {
    if (activeEngine === 'mongodb' && mongoClient) {
      const db = mongoClient.db(process.env.MONGODB_DB_NAME || 'onewaytaxibihar');
      const collections = ['bookings', 'drivers', 'users', 'vehicles', 'payments', 'coupons', 'audit_logs'];
      for (const colName of collections) {
        const docs = await db.collection(colName).find({}).toArray();
        if (docs && docs.length > 0) {
          memoryDb[colName] = docs.map(({ _id, ...rest }) => rest);
        }
      }
      console.log(`[Database Service] Remote MongoDB records loaded into memory.`);
    } else if (activeEngine === 'postgres' && pgPool) {
      const res = await pgPool.query('SELECT collection_name, data FROM oneway_documents');
      for (const row of res.rows) {
        memoryDb[row.collection_name] = row.data;
      }
      console.log(`[Database Service] Remote PostgreSQL records loaded into memory.`);
    }
  } catch (err) {
    console.warn('[Database Service] Pull from cloud warning:', err.message);
  }
}

async function syncToRemoteCloud(db) {
  try {
    if (activeEngine === 'mongodb' && mongoClient) {
      const mdb = mongoClient.db(process.env.MONGODB_DB_NAME || 'onewaytaxibihar');
      if (Array.isArray(db.bookings)) {
        for (const b of db.bookings) {
          const bId = b.bookingId || b.id;
          if (bId) await mdb.collection('bookings').updateOne({ bookingId: bId }, { $set: { ...b, bookingId: bId } }, { upsert: true });
        }
      }
      if (Array.isArray(db.users)) {
        for (const u of db.users) {
          if (u.id) await mdb.collection('users').updateOne({ id: u.id }, { $set: u }, { upsert: true });
        }
      }
      if (Array.isArray(db.payments)) {
        for (const p of db.payments) {
          const pId = p.id || p.orderId || p.paymentId;
          if (pId) await mdb.collection('payments').updateOne({ id: pId }, { $set: p }, { upsert: true });
        }
      }
    } else if (activeEngine === 'postgres' && pgPool) {
      const collections = ['bookings', 'drivers', 'users', 'vehicles', 'payments', 'coupons', 'audit_logs'];
      for (const col of collections) {
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

  // Push to remote cloud asynchronously without blocking HTTP request
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
  if (db.audit_logs.length > 500) db.audit_logs.pop(); // keep last 500 entries
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
    totalUsers: (memoryDb?.users || []).length
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
