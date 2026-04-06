import * as inventoryController from '#controllers/inventory.controller.js';
import {
  getItemsSchema,
  createItemSchema,
  paramsSchema,
} from '#schemas/inventory.schema.js';

export const inventoryRoutes = async (fastify) => {
  fastify.get(
    '/inventory',
    { schema: getItemsSchema },
    inventoryController.getItems,
  );

  fastify.post(
    '/inventory',
    { schema: createItemSchema },
    inventoryController.createItem,
  );

  fastify.put(
    '/inventory/:id',
    {
      schema: { params: paramsSchema },
    },
    inventoryController.updateItem,
  );

  fastify.delete(
    '/inventory/:id',
    {
      schema: { params: paramsSchema },
    },
    inventoryController.deleteItem,
  );
};
