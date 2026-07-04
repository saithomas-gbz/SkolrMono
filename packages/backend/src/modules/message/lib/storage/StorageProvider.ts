export interface StorageProvider {
  save(buffer: Buffer, key: string): Promise<string>;
  read(storageKey: string): Promise<Buffer>;
}
