import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import type { StorageProvider } from './StorageProvider';

const uploadsDir = resolve(process.env.UPLOADS_DIR || './uploads');

export class LocalDiskStorageProvider implements StorageProvider {
  async save(buffer: Buffer, key: string): Promise<string> {
    const filePath = join(uploadsDir, key);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return key;
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(join(uploadsDir, storageKey));
  }
}
