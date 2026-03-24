export const healthRoutes = async (fastify) => {
  fastify.get('/health', async () => {
    return { status: 'ok' };
  });
  fastify.get(
    '/health/details',
    {
      onRequest: async (request, reply) => {
        const apiKey = request.headers['x-api-key'];
        if (apiKey !== fastify.config.ADMIN_API_KEY) {
          throw reply.unauthorized('Invalid or missing API Key');
        }
      },
    },
    async () => {
      return {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      };
    },
  );
};
