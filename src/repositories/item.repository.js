import path from 'node:path';
import { ItemModel } from '../models/item.model.js';
import {
  deleteFileIfExists,
  ensureDirectory,
  listJsonFiles,
  readJsonFile,
  writeJsonAtomic,
  ITEMS_DIR,
} from '../utils/file-system.js';
import { normalizeStoredImagePath } from '../utils/item-url.js';
import { opendir, readFile } from 'node:fs/promises';

const getItemFilePath = (id) => path.join(ITEMS_DIR, `${id}.json`);
const getItemTmpFilePath = (id) => path.join(ITEMS_DIR, `${id}.tmp.json`);

const readItemFile = async (filePath) => {
  const item = await readJsonFile(filePath, null);

  if (!item) {
    return null;
  }

  return {
    ...ItemModel,
    ...item,
    id: Number(item.id),
    image: normalizeStoredImagePath(item.image),
  };
};

const getNextId = async () => {
  const items = await findAllItems();
  const ids = items.map((item) => Number(item.id)).filter(Number.isFinite);

  if (ids.length === 0) {
    return 1;
  }

  return Math.max(...ids) + 1;
};

const normalizeItem = (item) => ({
  ...ItemModel,
  ...item,
  id: Number(item.id),
  price: Number(item.price),
  qty: Number(item.qty ?? ItemModel.qty),
  image: normalizeStoredImagePath(item.image ?? ItemModel.image),
});

export const findAllItems = async () => {
  await ensureDirectory(ITEMS_DIR);
  const filePaths = await listJsonFiles(ITEMS_DIR);
  const items = await Promise.all(
    filePaths.map((filePath) => readItemFile(filePath)),
  );

  return items
    .filter(Boolean)
    .sort((firstItem, secondItem) => firstItem.id - secondItem.id);
};

export const findItemById = async (id) => {
  const item = await readItemFile(getItemFilePath(id));
  return item && Number(item.id) === Number(id) ? item : null;
};

export const createItemRecord = async (data) => {
  await ensureDirectory(ITEMS_DIR);

  const id =
    data.id !== undefined &&
    data.id !== null &&
    data.id !== '' &&
    Number.isFinite(Number(data.id))
      ? Number(data.id)
      : await getNextId();

  const item = normalizeItem({
    ...data,
    id,
  });

  await writeJsonAtomic(getItemFilePath(id), item, getItemTmpFilePath(id));
  return item;
};

export const updateItemRecord = async (id, updates) => {
  const currentItem = await findItemById(id);

  if (!currentItem) {
    return null;
  }

  const updatedItem = normalizeItem({
    ...currentItem,
    ...updates,
    id: currentItem.id,
  });

  await writeJsonAtomic(
    getItemFilePath(id),
    updatedItem,
    getItemTmpFilePath(id),
  );
  return updatedItem;
};

export const deleteItemRecord = async (id) => {
  const item = await findItemById(id);

  if (!item) {
    return false;
  }

  await deleteFileIfExists(getItemFilePath(id));
  return true;
};

export async function* streamAllItemsRecords() {
  const dir = await opendir(ITEMS_DIR);
  for await (const dirent of dir) {
    if (dirent.isFile() && dirent.name.endsWith('.json')) {
      const filePath = path.join(ITEMS_DIR, dirent.name);
      const fileContent = await readFile(filePath, 'utf8');
      yield JSON.parse(fileContent);
    }
  }
}
