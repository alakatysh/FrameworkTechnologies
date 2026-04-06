import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ItemModel } from '../models/item.model.js';
import {
  ITEMS_DIR,
  VERSION_FILE,
  ensureDirectory,
  listJsonFiles,
  readJsonFile,
  writeJsonAtomic,
} from '../utils/file-system.js';
import { normalizeStoredImagePath } from '../utils/item-url.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFilePath);

export const getCurrentModelHash = async () => {
  const modelFilePath = path.resolve(
    currentDirectory,
    '../models/item.model.js',
  );
  const modelSource = await fs.readFile(modelFilePath, 'utf8');

  return crypto.createHash('md5').update(modelSource).digest('hex');
};

export const getStoredModelHash = async () => {
  const versionData = await readJsonFile(VERSION_FILE, null);

  if (!versionData) {
    return null;
  }

  return versionData.hash ?? null;
};

export const isDataMigrationNeeded = async () => {
  const currentHash = await getCurrentModelHash();
  const storedHash = await getStoredModelHash();

  return currentHash !== storedHash;
};

export const migrateData = async () => {
  await ensureDirectory(ITEMS_DIR);

  const currentHash = await getCurrentModelHash();
  const storedHash = await getStoredModelHash();

  if (currentHash === storedHash) {
    return { migrated: 0, hash: currentHash };
  }

  const filePaths = await listJsonFiles(ITEMS_DIR);
  let migrated = 0;

  for (const filePath of filePaths) {
    const item = await readJsonFile(filePath, null);

    if (!item) {
      continue;
    }

    const migratedItem = {
      ...ItemModel,
      ...item,
      id: Number(item.id),
      image: normalizeStoredImagePath(item.image),
    };

    const tmpFilePath = path.join(
      path.dirname(filePath),
      `${path.basename(filePath, '.json')}.tmp.json`,
    );

    await writeJsonAtomic(filePath, migratedItem, tmpFilePath);
    migrated += 1;
  }

  const versionTmpFilePath = path.join(
    path.dirname(VERSION_FILE),
    `${path.basename(VERSION_FILE, '.json')}.tmp.json`,
  );

  await writeJsonAtomic(
    VERSION_FILE,
    { hash: currentHash },
    versionTmpFilePath,
  );

  return { migrated, hash: currentHash };
};

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  migrateData()
    .then(({ migrated, hash }) => {
      console.log(
        `Migration finished. Updated ${migrated} files. Hash: ${hash}`,
      );
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exitCode = 1;
    });
}
