const fs = require('fs');
const { MongoClient } = require('mongodb');

async function cleanAllTestData() {
  console.log('Cleaning fake test data from local snapshot and MongoDB Atlas...');

  // 1. Clean local data/db.json
  const dbPath = './data/db.json';
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8').replace(/^\uFEFF/, ''));

  db.bookings = [];
  db.leads = [];
  db.notifications = [];
  db.payments = [];
  db.wallet_ledger = [];
  db.driver_applications = [];
  db.audit_logs = [];
  db.drivers = (db.drivers || []).filter(d => !d.id.startsWith('drv_98'));
  db.users = (db.users || []).filter(u => u.role === 'admin' || u.phone === '+91 6206494214');

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('✅ Local data/db.json sanitized and cleaned!');

  // 2. Clean MongoDB Atlas Cloud Collections
  const mongoUri = 'mongodb+srv://himanshudu255_db_user:Himanshu%40123@cluster0.7pf5pvc.mongodb.net/onewaytaxibihar?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(mongoUri);
  await client.connect();
  const mDb = client.db('onewaytaxibihar');

  const bRes = await mDb.collection('bookings').deleteMany({});
  const lRes = await mDb.collection('leads').deleteMany({});
  const nRes = await mDb.collection('notifications').deleteMany({});
  const pRes = await mDb.collection('payments').deleteMany({});
  const wRes = await mDb.collection('wallet_ledger').deleteMany({});
  const dRes = await mDb.collection('drivers').deleteMany({ id: { $regex: /^drv_98/ } });
  const uRes = await mDb.collection('users').deleteMany({ role: { $ne: 'admin' }, phone: { $ne: '+91 6206494214' } });

  console.log('✅ MongoDB Atlas Cleaned:');
  console.log('   - Deleted Bookings:', bRes.deletedCount);
  console.log('   - Deleted Leads:', lRes.deletedCount);
  console.log('   - Deleted Notifications:', nRes.deletedCount);
  console.log('   - Deleted Payments:', pRes.deletedCount);
  console.log('   - Deleted Fake Drivers:', dRes.deletedCount);
  console.log('   - Deleted Fake Users:', uRes.deletedCount);

  await client.close();
  console.log('🎉 ALL FAKE/TEST DATA REMOVED COMPLETELY!');
}

cleanAllTestData().catch(console.error);
