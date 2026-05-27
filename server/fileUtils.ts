import fs from 'fs/promises';

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

export async function readTextFile(filePath: string, fallback = '') {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}
