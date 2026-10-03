const crypto = require('crypto');

const ALLOWED_ADMINS = {
  admin: { id: 'adm_01', name: 'Master Dispatch (Admin 1)', role: 'admin' },
  admin1: { id: 'adm_01', name: 'Master Dispatch (Admin 1)', role: 'admin' },
  admin2: { id: 'adm_02', name: 'Patna Central Dispatch (Admin 2)', role: 'admin' },
  admin3: { id: 'adm_03', name: 'North Bihar Dispatch (Admin 3)', role: 'admin' },
  admin4: { id: 'adm_04', name: 'South Bihar Dispatch (Admin 4)', role: 'admin' },
  admin5: { id: 'adm_05', name: 'East Bihar Dispatch (Admin 5)', role: 'admin' }
};

const VALID_PASSWORDS = [
  'harharmahadev@3',
  'admin123',
  'BiharTaxi@2026'
];

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
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

  const username = (body.username || '').trim().toLowerCase();
  const password = (body.password || '').trim();

  if (!username || !password) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: false, message: 'Username and password are required.' }));
  }

  const adminAccount = ALLOWED_ADMINS[username];

  if (!adminAccount || !VALID_PASSWORDS.includes(password)) {
    res.statusCode = 401;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      success: false,
      message: 'Invalid admin credentials. Please enter your authorized Admin Username and Password.'
    }));
  }

  const token = `adm_sess_${crypto.randomBytes(16).toString('hex')}`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({
    success: true,
    token,
    admin: {
      id: adminAccount.id,
      username: username,
      name: adminAccount.name,
      role: 'admin',
      phone: '+91 6206494214'
    },
    message: `Welcome ${adminAccount.name}! Central Dispatch authenticated successfully.`
  }));
};
