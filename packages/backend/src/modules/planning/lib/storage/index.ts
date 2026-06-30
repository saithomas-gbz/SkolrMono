import type { StorageProvider } from './StorageProvider';
import { LocalDiskStorageProvider } from './localDiskStorageProvider';

let provider: StorageProvider | undefined;

/** Une seule implémentation V1 (disque local) — point d'extension futur pour S3/Azure Blob. */
export function getStorageProvider(): StorageProvider {
  if (!provider) {
    provider = new LocalDiskStorageProvider();
  }
  return provider;
}
