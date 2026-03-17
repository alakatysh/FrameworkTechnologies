import { createServer } from 'node:http';
import { PORT, HOSTNAME, NODE_ENV } from '#config/config';
import handleRoutes from '#routes/router';

const server = createServer((req, res) => {
  res.on('finish', () => {
    const isError = res.statusCode >= 400;
    const logData = {
      timestamp: new Date().toISOString(),
      level: isError ? 'ERROR' : 'INFO',
      method: req.method,
      url: req.url,
      status: res.statusCode,
    };

    if (NODE_ENV === 'development') {
      const logfn = isError ? console.error : console.log;
      logfn(JSON.stringify(logData));
    } else if (NODE_ENV === 'production' && isError) {
      console.error(JSON.stringify(logData));
    }
  });

  handleRoutes(req, res);
});

const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  setTimeout(() => {
    console.error(
      JSON.stringify({ error: 'Could not close connections in time' }),
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
    console.log('Server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error(
    JSON.stringify({
      error: `Uncaught exception: ${err.message} \n${err.stack}`,
    }),
  );
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(
    JSON.stringify({
      error: `Unhandled rejection at: ${promise}, reason: ${reason}`,
    }),
  );
  gracefulShutdown('unhandledRejection');
});

server.listen(PORT, HOSTNAME, () => {
  console.log(
    `Server is running on http://${HOSTNAME}:${PORT} in ${NODE_ENV} mode.`,
  );
});
