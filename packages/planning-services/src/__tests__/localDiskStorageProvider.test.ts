import { describe, it, expect, afterAll } from 'bun:test';
import { rm } from 'fs/promises';
import { resolve } from 'path';

const testUploadsDir = resolve('./uploads-test-tmp');
process.env.UPLOADS_DIR = testUploadsDir;

const { LocalDiskStorageProvider } = await import('../lib/storage/localDiskStorageProvider');

afterAll(async () => {
  await rm(testUploadsDir, { recursive: true, force: true });
});

describe('LocalDiskStorageProvider', () => {
  it('écrit puis relit le même contenu binaire', async () => {
    const provider = new LocalDiskStorageProvider();
    const content = Buffer.from('contenu de test %PDF-1.4');

    const storageKey = await provider.save(content, 'justif-1/doc.pdf');
    const read = await provider.read(storageKey);

    expect(read.equals(content)).toBe(true);
  });
});
