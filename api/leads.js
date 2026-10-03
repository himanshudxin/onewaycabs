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

  // GET: Return all leads from MongoDB Atlas (Admin Portal)
  if (req.method === 'GET') {
    try {
      const db = await connectToDatabase();
      const leads = await db.collection('leads').find({}).sort({ createdAt: -1 }).limit(100).toArray();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, count: leads.length, leads }));
    } catch(err) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: err.message, leads: [] }));
    }
  }

  // POST: Capture Customer Lead
  if (req.method === 'POST') {
    try {
      const db = await connectToDatabase();
      const rawPhone = (body.phone || body.passengerPhone || '').replace(/\D/g, '');
      const cleanPhone = rawPhone.slice(-10);

      if (!cleanPhone || cleanPhone.length !== 10) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, message: 'A valid 10-digit mobile number is required.' }));
      }

      const leadId = `lead_${cleanPhone}_${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      const selectedCab = (body.selectedCab || body.cabTier || 'sedan').toLowerCase();
      const cabNameMap = {
        hatchback: 'Go Hatchback',
        sedan: 'Prime Sedan',
        sedan_prime: 'Executive Sedan',
        suv: 'Family SUV (Ertiga 6+1)',
        innova_crysta: 'Toyota Innova Crysta'
      };

      const newLead = {
        id: leadId,
        phone: `+91 ${cleanPhone}`,
        rawPhone: cleanPhone,
        cleanPhone: cleanPhone,
        passengerName: (body.passengerName || body.name || 'Website Inquiry').trim(),
        originCity: body.originCity || 'Patna',
        destCity: body.destCity || 'Gaya',
        tripType: body.tripType || 'oneway',
        distanceKm: Number(body.distanceKm) || 104,
        duration: body.duration || '2h 15m',
        selectedCab: selectedCab,
        cabName: cabNameMap[selectedCab] || 'Prime Sedan',
        cabPrice: Number(body.cabPrice || body.estFareSedan || body.totalFare || 2198),
        estFareSedan: Number(body.estFareSedan || 2198),
        estFareSuv: Number(body.estFareSuv || 3398),
        source: body.source || 'Website Fare Check',
        status: 'NEW',
        notes: body.notes || `Inquiry for ${cabNameMap[selectedCab] || 'Prime Sedan'}`,
        createdAt: now,
        updatedAt: now
      };

      await db.collection('leads').updateOne(
        { cleanPhone: cleanPhone },
        { $set: newLead },
        { upsert: true }
      );

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        lead: newLead,
        message: 'Lead captured successfully!'
      }));
    } catch(err) {
      console.error('[Leads API Error]:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  // DELETE: Permanently Delete Lead from MongoDB Atlas (Requires password 'deleteit')
  if (req.method === 'DELETE') {
    try {
      const leadId = (body.leadId || body.id || url.searchParams.get('id') || url.searchParams.get('leadId') || '').trim();
      const pass = (body.password || url.searchParams.get('password') || '').trim();

      if (pass !== 'deleteit' && pass !== 'harharmahadev@3') {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
          success: false,
          message: 'Access Denied: Incorrect deletion password. Required password is: deleteit'
        }));
      }

      if (!leadId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ success: false, message: 'Lead ID is required for deletion.' }));
      }

      const db = await connectToDatabase();
      const cleanPhone = leadId.replace(/\D/g, '').slice(-10);
      const result = await db.collection('leads').deleteOne({
        $or: [{ id: leadId }, { cleanPhone: cleanPhone }, { phone: `+91 ${cleanPhone}` }]
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        deletedCount: result.deletedCount,
        message: `Inquiry lead permanently deleted from database.`
      }));
    } catch(err) {
      console.error('[Leads Delete Error]:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: err.message }));
    }
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
};
