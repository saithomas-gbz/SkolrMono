import type { StorageProvider } from './StorageProvider';
import { LocalDiskStorageProvider } from './localDiskStorageProvider';
import { S3StorageProvider } from './s3StorageProvider';

let provider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider =
      process.env.STORAGE_BACKEND === 's3'
        ? new S3StorageProvider()
        : new LocalDiskStorageProvider();
  }
  return provider;
}
