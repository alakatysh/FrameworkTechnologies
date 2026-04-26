import { findAllItems } from '../src/repositories/item.repository.js';

export const getItemsV2 = async (request) => {
  const page = parseInt(request.query.page) || 1;
  const limit = parseInt(request.query.limit) || 10;
  const skip = (page - 1) * limit;

  const allItems = await findAllItems();
  const total = allItems.length;
  const data = allItems.slice(skip, skip + limit);
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};
