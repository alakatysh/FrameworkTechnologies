import * as healthController from '#controllers/health.controller';
import * as inventoryController from '#controllers/inventory.controller';

const handleRoutes = (req, res) => {
  const { method, url } = req;
  const parsedUrl = new URL(url, `http://${req.headers.host}`);
  const { pathname } = parsedUrl;

  if (pathname === '/health' && method === 'GET') {
    return healthController.getHealth(req, res);
  }

  if (pathname === '/inventory' && method === 'GET') {
    return inventoryController.getItems(req, res);
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not Found' }));
};

export default handleRoutes;
