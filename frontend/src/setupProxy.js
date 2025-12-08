const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api', // This path will be proxied
    createProxyMiddleware({
      target: 'http://backend:8000', // The target backend service
      changeOrigin: true,
    })
  );
};
