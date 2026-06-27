import { describe, it, expect, mock, beforeEach } from 'bun:test';

// Mocks déclarés avant l'import du module pour intercepter les commandes S3
const mockSend = mock();

mock.module('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = mockSend;
  },
  HeadBucketCommand: class HeadBucketCommand {
    constructor(public input: unknown) {}
  },
  CreateBucketCommand: class CreateBucketCommand {
    constructor(public input: unknown) {}
  },
  PutObjectCommand: class PutObjectCommand {
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class GetObjectCommand {
    constructor(public input: unknown) {}
  },
}));

// Import après mock.module
const { S3StorageProvider } = await import('../lib/storage/s3StorageProvider');

const TEST_BUCKET = process.env.S3_BUCKET || 'skolr-messages';

describe('S3StorageProvider', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('save : utilise HeadBucket puis PutObject quand le bucket existe', async () => {
    mockSend
      .mockResolvedValueOnce({}) // HeadBucketCommand → bucket existe
      .mockResolvedValueOnce({}); // PutObjectCommand

    const provider = new S3StorageProvider();
    const buffer = Buffer.from('hello pdf');
    const key = await provider.save(buffer, 'msg-1/uuid-doc.pdf');

    expect(key).toBe('msg-1/uuid-doc.pdf');
    expect(mockSend).toHaveBeenCalledTimes(2);

    const calls0 = mockSend.mock.calls as [unknown[], unknown[]][];
    expect((calls0[0]![0] as { constructor: { name: string } }).constructor.name).toBe('HeadBucketCommand');
    expect((calls0[1]![0] as { constructor: { name: string } }).constructor.name).toBe('PutObjectCommand');
  });

  it('save : crée le bucket avec CreateBucket si HeadBucket échoue, puis PutObject', async () => {
    mockSend
      .mockRejectedValueOnce(new Error('NoSuchBucket')) // HeadBucketCommand → bucket absent
      .mockResolvedValueOnce({}) // CreateBucketCommand
      .mockResolvedValueOnce({}); // PutObjectCommand

    const provider = new S3StorageProvider();
    const buffer = Buffer.from('data');
    const key = await provider.save(buffer, 'msg-2/uuid-img.png');

    expect(key).toBe('msg-2/uuid-img.png');
    expect(mockSend).toHaveBeenCalledTimes(3);

    const calls = mockSend.mock.calls as [unknown[], unknown[]][];
    expect((calls[0]![0] as { constructor: { name: string } }).constructor.name).toBe('HeadBucketCommand');
    expect((calls[1]![0] as { constructor: { name: string } }).constructor.name).toBe('CreateBucketCommand');
    expect((calls[2]![0] as { constructor: { name: string } }).constructor.name).toBe('PutObjectCommand');
  });

  it('read : lit le fichier et retourne un Buffer', async () => {
    const content = Buffer.from('PDF content');
    const fakeStream = {
      transformToByteArray: mock(async () => new Uint8Array(content)),
    };
    mockSend
      .mockResolvedValueOnce({}) // HeadBucketCommand (appelé dans save, pas ici)
      .mockResolvedValueOnce({ Body: fakeStream }); // GetObjectCommand

    // Contournement : on bypasse ensureBucket pour read en mockant directement
    mockSend.mockReset();
    mockSend.mockResolvedValueOnce({ Body: fakeStream });

    const provider = new S3StorageProvider();
    const result = await provider.read('msg-1/uuid-doc.pdf');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.toString()).toBe('PDF content');
    expect(mockSend).toHaveBeenCalledTimes(1);
    const call = mockSend.mock.calls[0]! as [unknown];
    expect((call[0] as { constructor: { name: string } }).constructor.name).toBe('GetObjectCommand');
  });
});
