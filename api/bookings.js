const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://himanshudu255_db_user:Himanshu%40123@cluster0.7pf5pvc.mongodb.net/onewaytaxibihar?retryWrites=true&w=majority&appName=Cluster0';
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000
  });
  await client.connect();
  cachedDb = client.db('onewaytaxibihar');
  return cachedDb;
}

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Parse URL & Query
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Parse Body
  let body = req.body || {};
  if (typeof body === 'string' && body.trim()) {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  } else if (!req.body && req.method !== 'GET') {
    try {
      const buffers = [];
      for await (const chunk of req) buffers.push(chunk);
      const data = Buffer.concat(buffers).toString('utf8');
      body = data ? JSON.parse(data) : {};
    } catch(e) { body = {}; }
  }

  // GET: Return all bookings from MongoDB Atlas (Admin)
  if (req.method === 'GET') {
    try {
      const db = await connectToDatabase();
      const bookings = await db.collection('bookings').find({}).sort({ createdAt: -1 }).limit(100).toArray();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, count: bookings.length, bookings }));
    } catch(err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: err.message, bookings: [] }));
    }
  }

  // POST: Create New Booking directly in MongoDB Atlas
  if (req.method === 'POST') {
    try {
      const db = await connectToDatabase();
      const bId = `OTB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const cleanPhone = (body.passengerPhone || body.phone || '').replace(/\D/g, '').slice(-10);
      
      const fleetClassMap = {
        hatchback: 'Go Hatchback',
        sedan: 'Prime Sedan',
        sedan_prime: 'Executive Sedan',
        suv: 'Family SUV (Ertiga 6+1)',
        innova_crysta: 'Toyota Innova Crysta'
      };

      const fleetModelMap = {
        hatchback: 'WagonR / Tiago',
        sedan: 'Dzire / Etios / Amaze',
        sedan_prime: 'Honda City / Ciaz',
        suv: 'Maruti Ertiga / Carens (6+1)',
        innova_crysta: 'Toyota Innova Crysta'
      };

      const selectedTier = (body.cabTier || 'sedan').toLowerCase();

      const newBooking = {
        bookingId: bId,
        passengerName: (body.passengerName || body.name || 'Valued Passenger').trim(),
        passengerPhone: `+91 ${cleanPhone}`,
        passengerEmail: body.passengerEmail || '',
        originCity: body.originCity || 'Patna',
        destCity: body.destCity || 'Gaya',
        pickupAddress: body.pickupAddress || `${body.originCity || 'Patna'} City`,
        dropAddress: body.dropAddress || `${body.destCity || 'Gaya'} City`,
        pickupDate: body.pickupDate || new Date().toISOString().split('T')[0],
        pickupTime: body.pickupTime || '10:00 AM',
        cabTier: selectedTier,
        fleetClass: fleetClassMap[selectedTier] || 'Prime Sedan',
        fleetModel: fleetModelMap[selectedTier] || 'Dzire / Etios',
        totalFare: Number(body.totalFare) || 2198,
        bookingStatus: 'REQUESTED',
        paymentMethod: body.paymentMethod || 'Cash / UPI to Driver',
        paymentStatus: (body.paymentMethod && body.paymentMethod.includes('Advance')) ? 'TOKEN ADVANCE VERIFIED' : 'PAYABLE TO DRIVER',
        paymentUtr: body.paymentUtr || '',
        driverDetails: null,
        createdAt: new Date().toISOString()
      };

      await db.collection('bookings').updateOne(
        { bookingId: bId },
        { $set: newBooking },
        { upsert: true }
      );

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        booking: newBooking,
        message: 'Booking confirmed successfully in Central Dispatch database!'
      }));
    } catch(err) {
      console.error('[Bookings API Error]:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  // DELETE: Permanently Delete Booking from MongoDB Atlas (Requires password 'deleteit')
  if (req.method === 'DELETE') {
    try {
      const bId = (body.bookingId || body.id || url.searchParams.get('bookingId') || url.searchParams.get('id') || '').trim();
      const pass = (body.password || url.searchParams.get('password') || '').trim();

      if (pass !== 'deleteit' && pass !== 'harharmahadev@3') {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: false,
          message: 'Access Denied: Incorrect deletion password. Required password is: deleteit'
        }));
      }

      if (!bId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, message: 'Booking ID is required for deletion.' }));
      }

      const db = await connectToDatabase();
      const result = await db.collection('bookings').deleteOne({
        $or: [{ bookingId: bId }, { id: bId }]
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        deletedCount: result.deletedCount,
        message: `Booking ${bId} permanently deleted from database.`
      }));
    } catch(err) {
      console.error('[Bookings Delete Error]:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
};
