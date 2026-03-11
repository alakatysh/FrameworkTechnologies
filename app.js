const { createServer } = require("node:http");
const { PORT, HOSTNAME, NODE_ENV } = require("./config.js");

let INVENTORY = [
  { id: 1, name: "Monitor", price: 500, qty: 10 },
  { id: 2, name: "Keyboard", price: 100, qty: 20 },
  { id: 3, name: "Mouse", price: 50, qty: 30 },
];

const server = createServer((req, res) => {
  //4  Реалізація логування JSON
  res.on("finish", () => {
    const isError = res.statusCode >= 400;
    const logData = {
      timestamp: new Date().toISOString(),
      level: isError ? "ERROR" : "INFO",
      method: req.method,
      url: req.url,
      status: res.statusCode,
    };

    if (NODE_ENV === "development") {
      const logfn = isError ? console.error : console.log;
      logfn(JSON.stringify(logData));
    } else if (NODE_ENV === "production" && isError) {
      console.error(JSON.stringify(logData));
    }
  });

  const method = req.method;
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // 8 Endpoint /health
  if (method === "GET" && pathname === "/health") {
    res.statusCode = 200;
    return res.end(
      JSON.stringify({
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      }),
    );
  }

  // GET /inventory
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

  // POST /inventory
  if (method === "POST" && pathname === "/inventory") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
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

  // PATCH /inventory/:id
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
      try {
        const updates = JSON.parse(body);
        delete updates.id;
        INVENTORY[index] = { ...INVENTORY[index], ...updates };
        res.end(JSON.stringify({ message: "Updated", item: INVENTORY[index] }));
      } catch (err) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "Invalid JSON format" }));
      }
    });
    return;
  }

  // DELETE /inventory/:id
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

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "Route not found" }));
});

// 5 Реалізація gracefulShutdown
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  setTimeout(() => {
    console.error(
      JSON.stringify({
        error: "Could not close connections in time, forcefully shutting down",
      }),
    );
    process.exit(1);
  }, 10000);

  server.closeAllConnections();

  server.close((err) => {
    if (err) {
      console.error(
        JSON.stringify({ error: `Error during server close: ${err.message}` }),
      );
      process.exit(1);
    }
    console.log("Server closed successfully.");
    process.exit(0);
  });
};

//  6 Обробники сигналів
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// 7 Глобальні обробники помилок
process.on("uncaughtException", (err) => {
  console.error(
    JSON.stringify({ error: `Uncaught exception: ${err.message}` }),
  );
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    JSON.stringify({
      error: `Unhandled rejection at: ${promise}, reason: ${reason}`,
    }),
  );
  gracefulShutdown("unhandledRejection");
});

// Запуск сервера
server.listen(PORT, HOSTNAME, () => {
  console.log(
    `Server is running on http://${HOSTNAME}:${PORT} in ${NODE_ENV} mode.`,
  );
});
