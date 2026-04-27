import * as inventoryController from '#controllers/inventory.controller.js';
import {
  createItemSchema,
  getItemsSchema,
  paramsSchema,
} from '#schemas/inventory.schema.js';

export const itemsRoutes = async (fastify) => {
  fastify.get(
    '/items',
    { schema: getItemsSchema },
    inventoryController.getItems,
  );

  fastify.post(
    '/items',
    { schema: createItemSchema },
    inventoryController.createItem,
  );

  fastify.put(
    '/items/:id',
    { schema: { params: paramsSchema } },
    inventoryController.updateItem,
  );

  fastify.delete(
    '/items/:id',
    { schema: { params: paramsSchema } },
    inventoryController.deleteItem,
  );

  fastify.get('/items/export', inventoryController.exportItems);
  fastify.get('/items/stream', inventoryController.streamItems);
  fastify.post('/items/import', inventoryController.importItems);
  fastify.get('/items/:id/details', inventoryController.getItemDetails);
  fastify.get('/backups/:timestamp', inventoryController.downloadBackup);

  fastify.post(
    '/items/:id/image',
    { schema: { params: paramsSchema } },
    inventoryController.uploadItemImage,
  );
};
