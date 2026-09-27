export interface UploadTarget {
  uploadUrl: string;
  storageKey: string;
  method: 'PUT' | 'POST';
  headers?: Record<string, string>;
  expiresAt: Date;
}

export interface StorageObjectMetadata {
  contentLength?: number;
  contentType?: string;
  eTag?: string;
  lastModified?: Date;
}

export interface StorageProvider {
  readonly name: string;

  /**
   * Creates a signed upload target or direct upload URL for the client.
   */
  createUploadTarget(
    key: string,
    mimeType: string,
    sizeBytes: number,
    expiresInSeconds?: number
  ): Promise<UploadTarget>;

  /**
   * Deletes an object from storage.
   */
  deleteObject(key: string): Promise<void>;

  /**
   * Checks whether an object exists in storage.
   */
  objectExists(key: string): Promise<boolean>;

  /**
   * Resolves the public or CDN URL for the given storage key.
   */
  getPublicUrl(key: string): string;

  /**
   * Optional: Upload buffer directly on the server (for small images, tests).
   */
  uploadBuffer?(key: string, buffer: Buffer, mimeType: string): Promise<string>;

  /**
   * Optional: Fetch object metadata from storage.
   */
  getObjectMetadata?(key: string): Promise<StorageObjectMetadata | null>;
}
