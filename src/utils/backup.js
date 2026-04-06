import path from 'node:path';
import {
  BACKUPS_DIR,
  ITEMS_DIR,
  copyDirectoryContents,
  ensureDirectory,
  listDirectories,
  removeDirectoryIfExists,
} from './file-system.js';

const BACKUP_LIMIT = 5;

export const createStartupBackup = async () => {
  await ensureDirectory(BACKUPS_DIR);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(BACKUPS_DIR, timestamp);

  await copyDirectoryContents(ITEMS_DIR, backupDir);

  const backups = (await listDirectories(BACKUPS_DIR)).sort().reverse();
  const obsoleteBackups = backups.slice(BACKUP_LIMIT);

  await Promise.all(
    obsoleteBackups.map((backupName) =>
      removeDirectoryIfExists(path.join(BACKUPS_DIR, backupName)),
    ),
  );

  return backupDir;
};
