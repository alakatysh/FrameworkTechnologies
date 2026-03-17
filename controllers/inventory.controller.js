import { getInventory, setInventory, addItem } from '#data/inventory.data';

export const getItems = (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const minPriceRaw = parsedUrl.searchParams.get('minPrice');
  let results = [...getInventory()];

  if (minPriceRaw !== null) {
    const minPrice = parseFloat(minPriceRaw);
    if (isNaN(minPrice) || minPrice < 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Invalid price' }));
    }
    results = results.filter((item) => item.price >= minPrice);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ count: results.length, items: results }));
};

export const createItem = (req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const data = JSON.parse(body);
      if (!data.name || typeof data.price !== 'number') {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'Name and price required' }));
      }

      const inventory = getInventory();
      const lastId =
        inventory.length > 0 ? inventory[inventory.length - 1].id : 0;
      const itemToSave = { id: lastId + 1, ...data, qty: data.qty || 0 };

      addItem(itemToSave);

      res.statusCode = 201;
      res.end(JSON.stringify({ message: 'Created', item: itemToSave }));
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }
  });
};

export const updateItem = (req, res, id) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    res.setHeader('Content-Type', 'application/json');
    const inventory = getInventory();
    const index = inventory.findIndex((d) => d.id === id);

    if (index === -1) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: 'Not Found' }));
    }

    try {
      const updates = JSON.parse(body);
      delete updates.id; // Забороняємо змінювати ID
      inventory[index] = { ...inventory[index], ...updates };
      res.end(JSON.stringify({ message: 'Updated', item: inventory[index] }));
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Invalid JSON format' }));
    }
  });
};

export const deleteItem = (req, res, id) => {
  const inventory = getInventory();
  const originalLength = inventory.length;

  const filteredInventory = inventory.filter((item) => item.id !== id);
  setInventory(filteredInventory);

  res.statusCode = filteredInventory.length < originalLength ? 200 : 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      message: res.statusCode === 200 ? 'Deleted' : 'Not Found',
    }),
  );
};
