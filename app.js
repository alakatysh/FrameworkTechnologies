import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { envSchema } from '#schemas/env.schema.js';
import { itemSchema } from '#schemas/inventory.schema.js';
import { healthRoutes } from '#routes/health.routes.js';
import { inventoryRoutes } from '#routes/inventory.routes.js';
import { itemsRoutes } from '#routes/items.routes.js';
import { githubV1Routes } from '#routes/v1/github.routes.js';
import { githubV2Routes } from '#routes/v2/github.v2.routes.js';
import { createStartupBackup } from './src/utils/backup.js';
import { isDataMigrationNeeded } from './src/migrations/migrate.js';
import inventoryV2Routes from '#routes/v2/inventory.v2.routes.js';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

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

  fastify.addSchema(itemSchema);

  await fastify.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

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

  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: function (request, context) {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `I limit exceeded, retry in ${context.after}`,
      };
    },
  });

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Inventory API',
        description: 'Документація REST API для Лабораторної роботи №6',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  await fastify.register(healthRoutes, { prefix: '/api/v1' });
  await fastify.register(inventoryRoutes, { prefix: '/api/v1' });
  await fastify.register(itemsRoutes, { prefix: '/api/v1' });

  await fastify.register(inventoryV2Routes, { prefix: '/api/v2' });
  await fastify.register(githubV1Routes, { prefix: '/api/v1' });
  await fastify.register(githubV2Routes, { prefix: '/api/v2' });

  await createStartupBackup().catch((error) => {
    fastify.log.error(error);
  });

  if (await isDataMigrationNeeded()) {
    fastify.log.warn(
      'Data schema changed. Run "npm run migrate" to update existing files.',
    );
  }

  return fastify;
};
