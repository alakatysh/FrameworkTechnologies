import { getInventory, setInventory, addItem } from '#data/inventory.data.js';
import { ERRORS } from '#constants/messages.js';

export const getItems = async (request) => {
  const { minPrice } = request.query;
  let results = [...getInventory()];

  if (minPrice !== undefined) {
    results = results.filter((item) => item.price >= minPrice);
  }

  return { count: results.length, items: results };
};

export const createItem = async (request, reply) => {
  const data = request.body;
  const inventory = getInventory();
  const lastId = inventory.length > 0 ? inventory[inventory.length - 1].id : 0;
  const itemToSave = { id: lastId + 1, ...data, qty: data.qty || 0 };

  addItem(itemToSave);

  reply.code(201);
  return { message: 'Created', item: itemToSave };
};

export const updateItem = async (request, reply) => {
  const { id } = request.params;
  const updates = request.body;
  const inventory = getInventory();
  const index = inventory.findIndex((d) => d.id === id);

  if (index === -1) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  inventory[index] = { ...inventory[index], ...updates };
  return { message: 'Updated', item: inventory[index] };
};

export const deleteItem = async (request, reply) => {
  const { id } = request.params;
  const inventory = getInventory();
  const originalLength = inventory.length;
  const filteredInventory = inventory.filter((item) => item.id !== id);

  setInventory(filteredInventory);

  if (filteredInventory.length === originalLength) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  return { message: 'Deleted' };
};
