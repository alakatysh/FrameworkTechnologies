import fs from 'node:fs/promises';
import path from 'node:path';

export const DATA_DIR = path.join(process.cwd(), 'data');
export const ITEMS_DIR = path.join(DATA_DIR, 'items');
export const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
export const VERSION_FILE = path.join(DATA_DIR, 'version.json');
export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const ensureDirectory = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

export const readJsonFile = async (filePath, fallback = null) => {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallback;
    }

    throw error;
  }
};

export const writeJsonAtomic = async (
  filePath,
  data,
  tmpFilePath = `${filePath}.tmp.json`,
) => {
  await ensureDirectory(path.dirname(filePath));

  try {
    await fs.writeFile(tmpFilePath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpFilePath, filePath);
  } catch (error) {
    try {
      await fs.unlink(tmpFilePath);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        console.error('Failed to cleanup tmp file:', cleanupError);
      }
    }

    throw error;
  }
};

export const listJsonFiles = async (dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(dirPath, entry.name));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

export const deleteFileIfExists = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

export const removeDirectoryIfExists = async (dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

export const copyDirectoryContents = async (sourceDir, targetDir) => {
  await ensureDirectory(targetDir);

  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
          await fs.cp(sourcePath, targetPath, { recursive: true });
          return;
        }

        if (entry.isFile()) {
          await fs.copyFile(sourcePath, targetPath);
        }
      }),
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

export const listDirectories = async (dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};
