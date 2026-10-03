const handler = require('./index.js');
module.exports = (req, res) => {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/health';
  }
  return handler(req, res);
};
