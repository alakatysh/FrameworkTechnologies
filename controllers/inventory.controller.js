import { ERRORS } from '#constants/messages.js';
import Ajv from 'ajv';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';
import { ItemModel } from '../src/models/item.model.js';
import {
  createItemRecord,
  deleteItemRecord,
  findAllItems,
  findItemById,
  updateItemRecord,
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

  reply.code(201);
  return { message: 'Created', item: toPublicItem(request, itemToSave) };
};

export const updateItem = async (request, reply) => {
  const { id } = request.params;
  const updatedItem = await updateItemRecord(id, request.body);

  if (!updatedItem) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  return { message: 'Updated', item: toPublicItem(request, updatedItem) };
};

export const deleteItem = async (request, reply) => {
  const { id } = request.params;
  const removed = await deleteItemRecord(id);

  if (!removed) {
    throw reply.notFound(ERRORS.ITEM_NOT_FOUND);
  }

  return { message: 'Deleted' };
};

export const exportItems = async (request, reply) => {
  const items = await findAllItems();
  const csv = stringify(toPublicItems(request, items), {
    header: true,
  });

  reply.header('Content-Disposition', 'attachment; filename="items.csv"');
  reply.type('text/csv; charset=utf-8');

  return csv;
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
