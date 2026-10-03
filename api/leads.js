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

  // Parse Body
  let body = req.body || {};
  if (typeof body === 'string' && body.trim()) {
    try { body = JSON.parse(body); } catch(e) { body = {}; }
  } else if (!req.body) {
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

      const newLead = {
        id: leadId,
        phone: `+91 ${cleanPhone}`,
        rawPhone: cleanPhone,
        cleanPhone: cleanPhone,
        passengerName: (body.passengerName || body.name || 'Website Inquiry').trim(),
        originCity: body.originCity || 'Patna',
        destCity: body.destCity || '',
        tripType: body.tripType || 'oneway',
        source: body.source || 'Website Fare Check',
        status: 'NEW',
        notes: body.notes || 'Inquiry captured from onewaytaxibihar.com',
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

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
};
