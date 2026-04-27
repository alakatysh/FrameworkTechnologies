import { eventBus } from '../src/utils/event-bus.js';
import { findAllItems } from '../src/repositories/item.repository.js';
import { toPublicItems } from '../src/utils/item-url.js';

export const wsRoutes = async (fastify) => {
  fastify.get('/ws', { websocket: true }, async (connection, request) => {
    // В деяких версіях @fastify/websocket сокет лежить прямо в connection
    const socket = connection.socket || connection;

    if (!socket || typeof socket.send !== 'function') {
      request.log.error('Не вдалося отримати доступ до WebSocket send()');
      return;
    }

    request.log.info('Клієнт підключився!');

    // Початкові дані
    const items = await findAllItems();
    socket.send(
      JSON.stringify({
        event: 'initial',
        data: toPublicItems(request, items),
      }),
    );

    const broadcast = (payload) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(payload));
      }
    };

    eventBus.on('inventory_change', broadcast);

    socket.on('close', () => {
      eventBus.off('inventory_change', broadcast);
    });
  });
};
