const handler = require('./index.js');
module.exports = (req, res) => {
  if (!req.url || req.url === '/' || req.url === '') {
    req.url = '/api/leads';
  }
  return handler(req, res);
};
