const handler = require('./index.js');
module.exports = (req, res) => {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/admin/system-status';
  }
  return handler(req, res);
};
