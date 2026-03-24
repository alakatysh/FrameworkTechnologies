export const itemSchema = {
  $id: 'Item',
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    price: { type: 'number' },
    qty: { type: 'integer' },
  },
};

export const getItemsSchema = {
  querystring: {
    type: 'object',
    properties: { minPrice: { type: 'number' } },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        count: { type: 'integer' },
        items: { type: 'array', items: { $ref: 'Item#' } },
      },
    },
  },
};

export const createItemSchema = {
  body: {
    type: 'object',
    required: ['name', 'price'],
    properties: {
      name: { type: 'string', minLength: 1 },
      price: { type: 'number', minimum: 0 },
      qty: { type: 'integer', minimum: 0 },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        item: { $ref: 'Item#' },
      },
    },
  },
};

export const paramsSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
  },
};
