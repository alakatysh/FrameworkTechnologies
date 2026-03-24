import { buildApp } from './app.js';

const start = async () => {
  const fastify = await buildApp();
  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);

    setTimeout(() => {
      console.error('Could not close connections in time');
      process.exit(1);
    }, 10000).unref();

    await fastify.close();
    console.log('Server closed successfully.');
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    console.error(`Uncaught exception: ${err.message} \n${err.stack}`);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
    gracefulShutdown('unhandledRejection');
  });

  try {
    await fastify.listen({
      port: fastify.config.PORT,
      host: fastify.config.HOSTNAME,
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
