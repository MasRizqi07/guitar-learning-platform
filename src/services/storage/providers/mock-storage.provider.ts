import { StorageProvider, UploadTarget, StorageObjectMetadata } from '../storage-provider';

interface StoredObject {
  buffer: Buffer;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export class MockStorageProvider implements StorageProvider {
  public readonly name = 'mock';
  private static store: Map<string, StoredObject> = new Map();
  private static failNextDelete = false;
  private static failNextUpload = false;
  private static failNextExists = false;

  public static reset() {
    MockStorageProvider.store.clear();
    MockStorageProvider.failNextDelete = false;
    MockStorageProvider.failNextUpload = false;
    MockStorageProvider.failNextExists = false;
  }

  public static setFailNextDelete(fail: boolean) {
    MockStorageProvider.failNextDelete = fail;
  }

  public static setFailNextUpload(fail: boolean) {
    MockStorageProvider.failNextUpload = fail;
  }

  public static setFailNextExists(fail: boolean) {
    MockStorageProvider.failNextExists = fail;
  }

  public static addVirtualObject(key: string, mimeType = 'image/png', sizeBytes = 1024) {
    MockStorageProvider.store.set(key, {
      buffer: Buffer.alloc(sizeBytes),
      mimeType,
      sizeBytes,
      uploadedAt: new Date(),
    });
  }

  public storeObject(key: string, buffer: Buffer, mimeType = 'image/png') {
    MockStorageProvider.store.set(key, {
      buffer,
      mimeType,
      sizeBytes: buffer.length,
      uploadedAt: new Date(),
    });
  }

  public simulateDeleteFailure(fail: boolean) {
    MockStorageProvider.failNextDelete = fail;
  }

  async createUploadTarget(
    key: string,
    mimeType: string,
    sizeBytes: number,
    expiresInSeconds = 900
  ): Promise<UploadTarget> {
    if (MockStorageProvider.failNextUpload) {
      MockStorageProvider.failNextUpload = false;
      throw new Error('MockStorageProvider simulated upload failure');
    }

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      uploadUrl: `/api/admin/media/upload/mock-target?key=${encodeURIComponent(key)}`,
      storageKey: key,
      method: 'POST',
      headers: {
        'Content-Type': mimeType,
      },
      expiresAt,
    };
  }

  async deleteObject(key: string): Promise<void> {
    if (MockStorageProvider.failNextDelete) {
      MockStorageProvider.failNextDelete = false;
      throw new Error('MockStorageProvider simulated delete failure');
    }
    MockStorageProvider.store.delete(key);
  }

  async objectExists(key: string): Promise<boolean> {
    if (MockStorageProvider.failNextExists) {
      MockStorageProvider.failNextExists = false;
      return false;
    }
    return MockStorageProvider.store.has(key);
  }

  getPublicUrl(key: string): string {
    return `/mock-media/${key}`;
  }

  async uploadBuffer(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (MockStorageProvider.failNextUpload) {
      MockStorageProvider.failNextUpload = false;
      throw new Error('MockStorageProvider simulated upload buffer failure');
    }

    MockStorageProvider.store.set(key, {
      buffer,
      mimeType,
      sizeBytes: buffer.length,
      uploadedAt: new Date(),
    });

    return this.getPublicUrl(key);
  }

  async getObjectMetadata(key: string): Promise<StorageObjectMetadata | null> {
    const obj = MockStorageProvider.store.get(key);
    if (!obj) return null;
    return {
      contentLength: obj.sizeBytes,
      contentType: obj.mimeType,
      lastModified: obj.uploadedAt,
    };
  }
}
