import { getItemsV2Schema } from '../../schemas/inventory.v2.schema.js';
import * as inventoryV2Controller from '../../controllers/inventory.v2.controller.js';

export default async function inventoryV2Routes(fastify) {
  fastify.get(
    '/items',
    {
      schema: getItemsV2Schema,
    },
    inventoryV2Controller.getItemsV2,
  );
}
