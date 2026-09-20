require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI not found in .env!');
  process.exit(1);
}

const dbName = process.env.MONGODB_DB_NAME || 'onewaytaxibihar';

async function migrate() {
  console.log('🚀 Starting Data Migration to MongoDB Atlas...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas Cluster!');
    const db = client.db(dbName);

    // 1. Read data/db.json
    const dbJsonPath = path.join(__dirname, '..', 'data', 'db.json');
    if (fs.existsSync(dbJsonPath)) {
      let content = fs.readFileSync(dbJsonPath, 'utf8');
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      const raw = JSON.parse(content);

      // Users
      if (Array.isArray(raw.users) && raw.users.length > 0) {
        console.log(`📦 Migrating ${raw.users.length} users...`);
        const usersCol = db.collection('users');
        for (const user of raw.users) {
          await usersCol.updateOne(
            { id: user.id },
            { $set: user },
            { upsert: true }
          );
        }
        await usersCol.createIndex({ id: 1 }, { unique: true });
        console.log(`  ✓ Users migrated & indexed successfully.`);
      }

      // Bookings
      if (Array.isArray(raw.bookings) && raw.bookings.length > 0) {
        console.log(`📦 Migrating ${raw.bookings.length} bookings...`);
        try { await db.collection('bookings').drop(); } catch (e) {}
        const bookingsCol = db.collection('bookings');
        for (const booking of raw.bookings) {
          const bId = booking.bookingId || booking.id || `OTB-${Date.now()}-${Math.floor(Math.random()*1000)}`;
          const toSave = { ...booking, bookingId: bId };
          await bookingsCol.updateOne(
            { bookingId: bId },
            { $set: toSave },
            { upsert: true }
          );
        }
        await bookingsCol.createIndex({ bookingId: 1 }, { unique: true });
        await bookingsCol.createIndex({ customerId: 1 });
        await bookingsCol.createIndex({ passengerPhone: 1 });
        await bookingsCol.createIndex({ assignedDriverId: 1 });
        console.log(`  ✓ Bookings migrated & indexed successfully.`);
      }

      // Drivers
      if (Array.isArray(raw.drivers) && raw.drivers.length > 0) {
        console.log(`📦 Migrating ${raw.drivers.length} drivers...`);
        const driversCol = db.collection('drivers');
        for (const driver of raw.drivers) {
          await driversCol.updateOne(
            { id: driver.id },
            { $set: driver },
            { upsert: true }
          );
        }
        await driversCol.createIndex({ id: 1 }, { unique: true });
        console.log(`  ✓ Drivers migrated & indexed successfully.`);
      }

      // Audit Logs
      if (Array.isArray(raw.audit) && raw.audit.length > 0) {
        console.log(`📦 Migrating ${raw.audit.length} audit logs...`);
        const auditCol = db.collection('audit');
        for (const log of raw.audit) {
          await auditCol.insertOne(log);
        }
        console.log(`  ✓ Audit logs migrated successfully.`);
      }
    }

    // 2. Locations / Cities
    const locationsPath = path.join(__dirname, '..', 'data', 'locations.json');
    if (fs.existsSync(locationsPath)) {
      const locData = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));
      const locCol = db.collection('locations');
      await locCol.updateOne(
        { type: 'bihar_districts_matrix' },
        { $set: { type: 'bihar_districts_matrix', data: locData, updatedAt: new Date() } },
        { upsert: true }
      );
      console.log('  ✓ Bihar locations matrix synced to MongoDB Atlas.');
    }

    // Verification Summary
    console.log('\n📊 MIGRATION SUMMARY ON MONGODB ATLAS:');
    const cols = ['users', 'bookings', 'drivers', 'locations', 'audit'];
    for (const c of cols) {
      const count = await db.collection(c).countDocuments();
      console.log(`   - ${c}: ${count} documents`);
    }

    console.log('\n🎉 ALL DATA IS NOW SECURELY STORED ONLINE IN MONGODB ATLAS!\n');
  } catch (err) {
    console.error('❌ Migration error:', err);
  } finally {
    await client.close();
  }
}

migrate();
