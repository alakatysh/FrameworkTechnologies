const { createServer } = require("node:http");

let INVENTORY = [
  { id: 1, name: "Monitor", price: 500, qty: 10 },
  { id: 2, name: "Keyboard", price: 100, qty: 20 },
  { id: 3, name: "Mouse", price: 50, qty: 30 },
];

const PORT = process.env.PORT || 3000;
const HOSTNAME = process.env.HOSTNAME || "localhost";

const server = createServer((req, res) => {
  const method = req.method;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // GET
  if (method === "GET" && pathname === "/inventory") {
    const minPriceRaw = parsedUrl.searchParams.get("minPrice");
    let results = [...INVENTORY];

    if (minPriceRaw !== null) {
      const minPrice = parseFloat(minPriceRaw);
      if (isNaN(minPrice) || minPrice < 0) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "Invalid price" }));
      }
      results = results.filter((item) => item.price >= minPrice);
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({ count: results.length, items: results }));
  }

  // POST
  if (method === "POST" && pathname === "/inventory") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);

        // Валідація обов'язкових полів
        if (!data.name || typeof data.price !== "number") {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Name and price required" }));
        }

        const lastId =
          INVENTORY.length > 0 ? INVENTORY[INVENTORY.length - 1].id : 0;
        const itemToSave = { id: lastId + 1, ...data, qty: data.qty || 0 };

        INVENTORY.push(itemToSave);
        res.statusCode = 201;
        res.end(JSON.stringify({ message: "Created", item: itemToSave }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  // PATCH
  if (method === "PATCH" && pathname.startsWith("/inventory/")) {
    const id = parseInt(pathname.split("/")[2], 10);
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      const index = INVENTORY.findIndex((d) => d.id === id);
      if (index === -1) {
        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Not Found" }));
      }

      const updates = JSON.parse(body);
      delete updates.id;

      INVENTORY[index] = { ...INVENTORY[index], ...updates };
      res.end(JSON.stringify({ message: "Updated", item: INVENTORY[index] }));
    });
    return;
  }

  // DELETE
  if (method === "DELETE" && pathname.startsWith("/inventory/")) {
    const id = parseInt(pathname.split("/")[2], 10);
    const originalLength = INVENTORY.length;
    INVENTORY = INVENTORY.filter((item) => item.id !== id);

    res.statusCode = INVENTORY.length < originalLength ? 200 : 404;
    res.end(
      JSON.stringify({
        message: res.statusCode === 200 ? "Deleted" : "Not Found",
      }),
    );
    return;
  }

  // 404 для всіх інших запитів
  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Route not found" }));
});

server.listen(PORT, HOSTNAME, () => {
  console.log(`Server: http://${HOSTNAME}:${PORT}/`);
});
