import fs from 'node:fs/promises';
import path from 'node:path';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cache', 'reference.json');

export const getFromCache = async (key, ttlSeconds = 120) => {
  try {
    const data = await fs.readFile(CACHE_FILE, 'utf8');
    const cache = JSON.parse(data);
    const item = cache[key];

    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > ttlSeconds * 1000) {
      return null; // Час життя кешу вийшов
    }
    return item.data;
  } catch (err) {
    return null; // Файлу ще немає або він пустий
  }
};

export const saveToCache = async (key, data) => {
  try {
    const dir = path.dirname(CACHE_FILE);
    await fs.mkdir(dir, { recursive: true }); // Створюємо папку, якщо немає

    let cache = {};
    try {
      const existingData = await fs.readFile(CACHE_FILE, 'utf8');
      cache = JSON.parse(existingData);
    } catch (e) {}

    cache[key] = {
      timestamp: Date.now(),
      data: data,
    };

    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error('Помилка запису в кеш:', err);
  }
};

export const fetchWithRetry = async (url, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    // AbortController для Timeout 5 секунд
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId); // Очищаємо таймер, якщо встигли

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (attempt === retries - 1) {
        throw error;
      }

      const delay = 1000 * Math.pow(2, attempt);
      console.warn(
        `Fetch failed (${error.message}). Retrying in ${delay}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};
