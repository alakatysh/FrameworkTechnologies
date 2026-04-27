import { ERRORS } from '#constants/messages.js';
import Ajv from 'ajv';
import { createWriteStream, createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { eventBus } from '../src/utils/event-bus.js';
import { ItemModel } from '../src/models/item.model.js';
import { CurrencyTransform } from '../src/transforms/currency.transform.js';
import {
  createItemRecord,
  deleteItemRecord,
  findAllItems,
  findItemById,
  updateItemRecord,
  streamAllItemsRecords,
} from '../src/repositories/item.repository.js';
import {
  normalizeStoredImagePath,
  toPublicItem,
  toPublicItems,
} from '../src/utils/item-url.js';
import {
  UPLOADS_DIR,
  deleteFileIfExists,
  ensureDirectory,
} from '../src/utils/file-system.js';
import { importItemSchema } from '#schemas/inventory.schema.js';
import {
  fetchWithRetry,
  getFromCache,
  saveToCache,
} from '../src/utils/external-api.js';

const importValidator = new Ajv({
  allErrors: true,
  coerceTypes: true,
  useDefaults: true,
}).compile(importItemSchema);

export const getItems = async (request) => {
  const { minPrice } = request.query;
  let results = await findAllItems();

  if (minPrice !== undefined) {
    results = results.filter((item) => item.price >= minPrice);
  }

  return { count: results.length, items: toPublicItems(request, results) };
};

export const createItem = async (request, reply) => {
  const itemToSave = await createItemRecord(request.body);
  const publicItem = toPublicItem(request, itemToSave);

  // Сповіщаємо WebSocket про створення
  eventBus.emit('inventory_change', { event: 'created', data: publicItem });

  reply.code(201);
  return { message: 'Created', item: publicItem };
};

export const updateItem = async (request, reply) => {
  const { id } = request.params;
  const updatedItem = await updateItemRecord(id, request.body);

  if (!updatedItem) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  const publicItem = toPublicItem(request, updatedItem);

  // Сповіщаємо WebSocket про оновлення
  eventBus.emit('inventory_change', { event: 'updated', data: publicItem });

  return { message: 'Updated', item: publicItem };
};

export const deleteItem = async (request, reply) => {
  const { id } = request.params;
  const removed = await deleteItemRecord(id);

  if (!removed) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  // Сповіщаємо WebSocket про видалення
  eventBus.emit('inventory_change', { event: 'deleted', id: Number(id) });

  return { message: 'Deleted' };
};

export const exportItems = async (request, reply) => {
  const { transform } = request.query;
  const rate = request.server.config.UAH_EXCHANGE_RATE;

  const items = await findAllItems();
  const publicItems = toPublicItems(request, items);

  const sourceStream = Readable.from(publicItems);

  const csvTransformer = new Transform({
    objectMode: true,
    transform(item, encoding, callback) {
      const row = `${item.id},${item.name},${item.price},${item.category}\n`;
      callback(null, row);
    },
  });

  reply.header('Content-Disposition', 'attachment; filename="items.csv"');
  reply.type('text/csv; charset=utf-8');

  reply.raw.write('id,name,price,category\n');

  if (transform === 'true') {
    await pipeline(
      sourceStream,
      new CurrencyTransform(rate),
      csvTransformer,
      reply.raw,
    );
  } else {
    await pipeline(sourceStream, csvTransformer, reply.raw);
  }
};

export const importItems = async (request, reply) => {
  const file = await request.file();

  if (!file) {
    throw reply.badRequest('File is required');
  }

  const buffer = await file.toBuffer();
  const fileExtension = file.filename?.split('.').pop()?.toLowerCase();
  const mimetype = file.mimetype;
  let records;

  try {
    if (mimetype === 'application/json' || fileExtension === 'json') {
      records = JSON.parse(buffer.toString('utf8'));
    } else if (mimetype === 'text/csv' || fileExtension === 'csv') {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } else {
      throw reply.badRequest('Only CSV and JSON files are supported');
    }
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw reply.badRequest('Invalid CSV or JSON file');
  }

  const recordList = Array.isArray(records) ? records : [records];
  const report = {
    imported: 0,
    rejected: 0,
    errors: [],
  };

  for (const [index, record] of recordList.entries()) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      report.rejected += 1;
      report.errors.push({
        index: index + 1,
        reason: 'Record must be an object',
      });
      continue;
    }

    const normalizedRecord = {
      ...ItemModel,
      ...record,
      category: record.category ?? ItemModel.category,
      image: normalizeStoredImagePath(record.image ?? null),
    };

    if (record.id === undefined || record.id === null || record.id === '') {
      delete normalizedRecord.id;
    } else {
      normalizedRecord.id = Number(record.id);
    }

    const isValid = importValidator(normalizedRecord);

    if (!isValid) {
      report.rejected += 1;
      report.errors.push({
        index: index + 1,
        reason: (importValidator.errors ?? [])
          .map((error) => `${error.instancePath || '/'} ${error.message}`)
          .join(', '),
      });
      continue;
    }

    await createItemRecord(normalizedRecord);
    report.imported += 1;
  }

  return report;
};

export const uploadItemImage = async (request, reply) => {
  const { id } = request.params;
  const item = await findItemById(id);

  if (!item) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  const file = await request.file();

  if (!file) {
    throw reply.badRequest('File is required');
  }

  if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
    throw reply.badRequest('Only images allowed');
  }

  const uploadDir = path.join(UPLOADS_DIR, String(id));
  const destinationPath = path.join(uploadDir, 'image.jpg');

  await ensureDirectory(uploadDir);

  try {
    await pipeline(file.file, createWriteStream(destinationPath));
    const updatedItem = await updateItemRecord(id, {
      image: `/${id}/image.jpg`,
    });

    return {
      message: 'Image uploaded',
      item: toPublicItem(request, updatedItem),
    };
  } catch (error) {
    await deleteFileIfExists(destinationPath);
    throw error;
  }
};

export const getItemDetails = async (request, reply) => {
  const { id } = request.params;
  const item = await findItemById(id);

  if (!item) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  let externalDetails = null;
  const cacheKey = `category_${item.category}`;

  const cachedData = await getFromCache(cacheKey);

  if (cachedData) {
    externalDetails = cachedData;
    request.log.info('External data loaded from CACHE');
  } else {
    try {
      request.log.info('Fetching from External JSON Server...');
      const url = `http://localhost:3001/categories?name=${item.category}`;
      const data = await fetchWithRetry(url);

      if (data && data.length > 0) {
        externalDetails = data[0];
        await saveToCache(cacheKey, externalDetails);
      }
    } catch (error) {
      request.log.error(`External Service Unavailable: ${error.message}`);
    }
  }

  return reply.send({
    ...toPublicItem(request, item),
    externalDetails,
  });
};

export const streamItems = async (request, reply) => {
  const sourceStream = Readable.from(streamAllItemsRecords());

  const ndjsonTransform = new Transform({
    objectMode: true,
    transform(item, encoding, callback) {
      const publicItem = toPublicItem(request, item);
      const ndjsonLine = JSON.stringify(publicItem) + '\n';
      callback(null, ndjsonLine);
    },
  });

  reply.type('application/x-ndjson');
  return reply.send(sourceStream.pipe(ndjsonTransform));
};

// ПУНКТ 6: Скачування бекапу
export const downloadBackup = async (request, reply) => {
  const { timestamp } = request.params;
  const apiKey = request.headers['x-api-key'];

  // Перевірка API ключа
  if (apiKey !== request.server.config.ADMIN_API_KEY) {
    throw reply.unauthorized('Invalid API Key');
  }

  const filePath = path.join(
    process.cwd(),
    'data',
    'backups',
    `${timestamp}.gz`,
  );

  try {
    await access(filePath);
    const stream = createReadStream(filePath);

    reply.type('application/gzip');
    reply.header(
      'Content-Disposition',
      `attachment; filename="${timestamp}.gz"`,
    );

    return reply.send(stream);
  } catch (error) {
    throw reply.notFound('Backup file not found');
  }
};
