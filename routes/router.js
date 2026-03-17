const healthController = require('#controllers/health.controller');
const inventoryController = require('#controllers/inventory.controller');

const handleRoutes = (req, res) => {
  const { method, url } = req;

  if (url === '/health' && method === 'GET') {
    return healthController.getHealth(req, res);
  }

  if (url === '/inventory' && method === 'GET') {
    return inventoryController.getItems(req, res);
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not Found' }));
};

module.exports = handleRoutes;
