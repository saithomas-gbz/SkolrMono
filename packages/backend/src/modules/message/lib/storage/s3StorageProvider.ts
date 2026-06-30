import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { StorageProvider } from './StorageProvider';

const bucket = process.env.S3_BUCKET || 'skolr-messages';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || 'http://minio:9000',
      region: process.env.S3_REGION || 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
      },
    });
  }

  async save(buffer: Buffer, key: string): Promise<string> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer }),
    );
    return key;
  }

  async read(storageKey: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: storageKey }),
    );
    const array = await (response.Body as { transformToByteArray(): Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(array);
  }

  private async ensureBucket(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }
}
