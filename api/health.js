module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({
    success: true,
    status: 'ONLINE',
    platform: 'OneWayTaxiBihar Production Cloud',
    domain: 'onewaytaxibihar.com',
    engine: 'MongoDB Atlas Active',
    timestamp: new Date().toISOString()
  }));
};
