import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createItemRecord } from '../repositories/item.repository.js';
import {
  ITEMS_DIR,
  ensureDirectory,
  listJsonFiles,
} from '../utils/file-system.js';

const initialItems = [
  { id: 1, name: 'Monitor', price: 500, qty: 10, category: 'display' },
  { id: 2, name: 'Keyboard', price: 100, qty: 20, category: 'input' },
  { id: 3, name: 'Mouse', price: 50, qty: 30, category: 'input' },
];

export const seedItems = async () => {
  await ensureDirectory(ITEMS_DIR);

  const filePaths = await listJsonFiles(ITEMS_DIR);
  await Promise.all(filePaths.map((filePath) => fs.unlink(filePath)));

  for (const item of initialItems) {
    await createItemRecord(item);
  }
};

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  seedItems()
    .then(() => {
      console.log('Seed completed');
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exitCode = 1;
    });
}
