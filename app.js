import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import fastifySensible from '@fastify/sensible';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import path from 'node:path';

// Імпорти схем
import { envSchema } from './schemas/env.schema.js';
import { itemSchema } from './schemas/inventory.schema.js';

// Імпорти маршрутів
import { healthRoutes } from './routes/health.routes.js';
import { inventoryRoutes } from './routes/inventory.routes.js';
import { itemsRoutes } from './routes/items.routes.js';
import { wsRoutes } from './routes/ws.routes.js';
import { githubV1Routes } from './routes/v1/github.routes.js';
import { githubV2Routes } from './routes/v2/github.v2.routes.js';
import inventoryV2Routes from './routes/v2/inventory.v2.routes.js';

// Імпорти сервісів та утиліт
import { isDataMigrationNeeded } from './src/migrations/migrate.js';
import { createGzipBackup } from './src/services/backup.service.js';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

export const buildApp = async () => {
  const isDev = process.env.NODE_ENV === 'development'; // eslint-disable-line no-process-env

  const fastify = Fastify({
    logger: {
      level: isDev ? 'info' : 'error',
      transport: isDev ? { target: 'pino-pretty' } : undefined,
    },
  });

  // 1. Конфігурація (завжди першою)
  await fastify.register(fastifyEnv, {
    schema: envSchema,
    dotenv: true,
  });

  // 2. Базові плагіни безпеки
  await fastify.register(fastifyHelmet, { global: true });
  await fastify.register(fastifyCors, {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
  });

  // 3. WEBSOCKET - Реєструємо плагін та маршрут в одному блоці
  // Це гарантує, що маршрут /ws точно бачитиме функціонал сокетів
  await fastify.register(fastifyWebsocket);
  await fastify.register(wsRoutes, { prefix: '/api/v1' });

  // 4. Додаткові системні плагіни
  await fastify.register(fastifySensible);
  fastify.addSchema(itemSchema);

  await fastify.register(fastifyMultipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  await fastify.register(fastifyStatic, {
    root: path.join(process.cwd(), 'uploads'),
    prefix: '/uploads/',
  });

  // 5. Глобальна обробка помилок
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message: error.message || 'Internal Server Error',
    });
  });

  // 6. Обмеження запитів та документація
  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Inventory API',
        version: '1.0.0',
      },
      servers: [{ url: 'http://localhost:3000' }],
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
  });

  // 7. РЕЄСТРАЦІЯ РЕШТИ МАРШРУТІВ
  await fastify.register(healthRoutes, { prefix: '/api/v1' });
  await fastify.register(inventoryRoutes, { prefix: '/api/v1' });
  await fastify.register(itemsRoutes, { prefix: '/api/v1' });
  await fastify.register(inventoryV2Routes, { prefix: '/api/v2' });
  await fastify.register(githubV1Routes, { prefix: '/api/v1' });
  await fastify.register(githubV2Routes, { prefix: '/api/v2' });

  // 8. Запуск бекапу та перевірка міграцій
  await createGzipBackup().catch((error) => {
    fastify.log.error('Backup error:', error);
  });

  if (await isDataMigrationNeeded()) {
    fastify.log.warn('Data schema changed. Run migration.');
  }

  return fastify;
};
