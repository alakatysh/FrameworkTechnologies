import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { envSchema } from '#schemas/env.schema.js';
import { healthRoutes } from '#routes/health.routes.js';
import { inventoryRoutes } from '#routes/inventory.routes.js';

export const buildApp = async () => {
  // eslint-disable-next-line no-process-env
  const isDev = process.env.NODE_ENV === 'development';

  const fastify = Fastify({
    logger: {
      level: isDev ? 'info' : 'error',
      transport: isDev ? { target: 'pino-pretty' } : undefined,
    },
  });

  await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
  });

  await fastify.register(fastifyHelmet, { global: true });

  await fastify.register(fastifyCors, {
    origin:
      fastify.config.NODE_ENV === 'production' ? 'https://example.com' : '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  });

  await fastify.register(fastifySensible);

  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;

    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message: error.message || 'Internal Server Error',
    });
  });

  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Сервер успішно закрито (onClose hook)');
  });

  await fastify.register(healthRoutes);
  await fastify.register(inventoryRoutes);

  return fastify;
};
