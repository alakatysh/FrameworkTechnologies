import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import zlib from 'zlib';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const ITEMS_DIR = path.join(process.cwd(), 'data', 'items');
const BACKUPS_DIR = path.join(process.cwd(), 'data', 'backups');

export const createGzipBackup = async () => {
  try {
    await fs.mkdir(BACKUPS_DIR, { recursive: true });

    const files = await fs.readdir(ITEMS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));

    if (jsonFiles.length === 0) return;

    const timestamp = Date.now();
    const backupPath = path.join(BACKUPS_DIR, `${timestamp}.gz`);

    async function* mergedSource() {
      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(ITEMS_DIR, file), 'utf8');
        yield content + '\n';
      }
    }

    await pipeline(
      Readable.from(mergedSource()),
      zlib.createGzip(),
      createWriteStream(backupPath),
    );

    await cleanOldBackups();
  } catch (err) {
    console.error('Backup error:', err);
  }
};

const cleanOldBackups = async () => {
  const files = await fs.readdir(BACKUPS_DIR);
  const backups = files
    .filter((f) => f.endsWith('.gz'))
    .map((f) => ({ name: f, time: parseInt(f.split('.')[0]) }))
    .sort((a, b) => b.time - a.time);

  if (backups.length > 5) {
    const toDelete = backups.slice(5);
    for (const file of toDelete) {
      await fs.unlink(path.join(BACKUPS_DIR, file.name));
    }
  }
};
