require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'onewaytaxibihar';
const dbJsonPath = path.join(__dirname, '..', 'data', 'db.json');

let client = null;

async function getClient() {
  if (!client) {
    client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
  }
  return client;
}

function readLocalDb() {
  if (!fs.existsSync(dbJsonPath)) return { users: [], bookings: [], drivers: [] };
  let content = fs.readFileSync(dbJsonPath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  return JSON.parse(content);
}

function writeLocalDb(data) {
  fs.writeFileSync(dbJsonPath, JSON.stringify(data, null, 2), 'utf8');
}

// Push local changes to MongoDB Atlas
async function pushToMongo() {
  const local = readLocalDb();
  const c = await getClient();
  const db = c.db(dbName);

  if (Array.isArray(local.users)) {
    for (const u of local.users) {
      if (u.id) await db.collection('users').updateOne({ id: u.id }, { $set: u }, { upsert: true });
    }
  }

  if (Array.isArray(local.bookings)) {
    for (const b of local.bookings) {
      const bId = b.bookingId || b.id;
      if (bId) await db.collection('bookings').updateOne({ bookingId: bId }, { $set: { ...b, bookingId: bId } }, { upsert: true });
    }
  }

  if (Array.isArray(local.drivers)) {
    for (const d of local.drivers) {
      if (d.id) await db.collection('drivers').updateOne({ id: d.id }, { $set: d }, { upsert: true });
    }
  }

  console.log('✅ Local db synced to MongoDB Atlas successfully.');
}

// Pull latest data from MongoDB Atlas to local
async function pullFromMongo() {
  const c = await getClient();
  const db = c.db(dbName);

  const users = await db.collection('users').find({}).toArray();
  const bookings = await db.collection('bookings').find({}).toArray();
  const drivers = await db.collection('drivers').find({}).toArray();

  const local = readLocalDb();
  local.users = users.map(({ _id, ...rest }) => rest);
  local.bookings = bookings.map(({ _id, ...rest }) => rest);
  local.drivers = drivers.map(({ _id, ...rest }) => rest);

  writeLocalDb(local);
  console.log(`✅ MongoDB Atlas data pulled: ${users.length} users, ${bookings.length} bookings, ${drivers.length} drivers.`);
}

// If invoked from command line
const action = process.argv[2];
if (action === 'push') {
  pushToMongo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
} else if (action === 'pull') {
  pullFromMongo().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}

module.exports = { getClient, pushToMongo, pullFromMongo };
