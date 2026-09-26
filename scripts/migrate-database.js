/**
 * OneWayTaxiBihar (onewaytaxibihar.com)
 * Production Database Migration Script
 * Seamlessly migrates data/db.json into MongoDB Atlas or PostgreSQL
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { initDatabase, getDb, saveDb, getDatabaseStatus } = require('../services/db.js');

async function runMigration() {
  console.log('=====================================================');
  console.log('OneWayTaxiBihar - Enterprise Cloud Database Migration');
  console.log('=====================================================');

  const status = await initDatabase();
  console.log(`Current DB Engine: ${status.engine} (Connected: ${status.connected})`);

  const dbPath = path.join(__dirname, '..', 'data', 'db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ data/db.json not found!');
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);

  console.log(`Found local records to sync:`);
  console.log(`- Bookings: ${(data.bookings || []).length}`);
  console.log(`- Drivers:  ${(data.drivers || []).length}`);
  console.log(`- Users:    ${(data.users || []).length}`);
  console.log(`- Vehicles: ${(data.vehicles || []).length}`);
  console.log(`- Admins:   ${(data.admins || []).length}`);

  saveDb(data);

  console.log('\n✅ Data successfully committed to Database Service Layer.');
  console.log(`Status details:`, getDatabaseStatus());
  console.log('=====================================================\n');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
