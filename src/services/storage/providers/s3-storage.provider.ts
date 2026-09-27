import crypto from 'crypto';
import { StorageProvider, UploadTarget, StorageObjectMetadata } from '../storage-provider';

export interface S3Config {
  bucket: string;
  region?: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl?: string;
}

export class S3StorageProvider implements StorageProvider {
  public readonly name = 's3';
  private config: S3Config;

  constructor(config: S3Config) {
    if (!config.bucket) throw new Error('S3 bucket must be specified');
    if (!config.accessKeyId) throw new Error('S3 accessKeyId must be specified');
    if (!config.secretAccessKey) throw new Error('S3 secretAccessKey must be specified');

    this.config = {
      ...config,
      region: config.region || 'auto',
    };
  }

  private getHost(): string {
    if (this.config.endpoint) {
      try {
        const parsed = new URL(this.config.endpoint);
        return parsed.host;
      } catch {
        return this.config.endpoint.replace(/^https?:\/\//, '');
      }
    }
    return `${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
  }

  private getBaseUrl(): string {
    if (this.config.endpoint) {
      const cleanEndpoint = this.config.endpoint.replace(/\/$/, '');
      return `${cleanEndpoint}/${this.config.bucket}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com`;
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\//, '');
    if (this.config.publicBaseUrl) {
      const base = this.config.publicBaseUrl.replace(/\/$/, '');
      return `${base}/${cleanKey}`;
    }
    return `${this.getBaseUrl()}/${cleanKey}`;
  }

  /**
   * Generates AWS SigV4 Presigned PUT URL
   */
  async createUploadTarget(
    key: string,
    mimeType: string,
    _sizeBytes: number,
    expiresInSeconds = 900
  ): Promise<UploadTarget> {
    const cleanKey = key.replace(/^\//, '');
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const region = this.config.region || 'auto';
    const service = 's3';

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const host = this.getHost();
    const path = this.config.endpoint ? `/${this.config.bucket}/${cleanKey}` : `/${cleanKey}`;

    const queryParams: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.config.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': expiresInSeconds.toString(),
      'X-Amz-SignedHeaders': 'content-type;host',
    };

    const sortedQuery = Object.keys(queryParams)
      .sort()
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
      .join('&');

    const canonicalHeaders = `content-type:${mimeType}\nhost:${host}\n`;
    const signedHeaders = 'content-type;host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
      'PUT',
      path,
      sortedQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(this.config.secretAccessKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const signedUrl = `${this.config.endpoint ? this.config.endpoint.replace(/\/$/, '') : `https://${host}`}${path}?${sortedQuery}&X-Amz-Signature=${signature}`;

    return {
      uploadUrl: signedUrl,
      storageKey: cleanKey,
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  async deleteObject(key: string): Promise<void> {
    const cleanKey = key.replace(/^\//, '');
    const url = `${this.getBaseUrl()}/${cleanKey}`;

    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getSignedHeaders('DELETE', cleanKey),
      });

      if (!res.ok && res.status !== 404) {
        throw new Error(`S3 delete failed with HTTP ${res.status}`);
      }
    } catch (err: unknown) {
      throw new Error(`S3 deleteObject failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async objectExists(key: string): Promise<boolean> {
    const cleanKey = key.replace(/^\//, '');
    const url = `${this.getBaseUrl()}/${cleanKey}`;

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: this.getSignedHeaders('HEAD', cleanKey),
      });

      if (res.status === 200) return true;
      if (res.status === 404) return false;
      return false;
    } catch {
      return false;
    }
  }

  async getObjectMetadata(key: string): Promise<StorageObjectMetadata | null> {
    const cleanKey = key.replace(/^\//, '');
    const url = `${this.getBaseUrl()}/${cleanKey}`;

    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: this.getSignedHeaders('HEAD', cleanKey),
      });

      if (!res.ok) return null;

      const contentLength = res.headers.get('content-length');
      const contentType = res.headers.get('content-type');
      const eTag = res.headers.get('etag');
      const lastModified = res.headers.get('last-modified');

      return {
        contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
        contentType: contentType || undefined,
        eTag: eTag ? eTag.replace(/"/g, '') : undefined,
        lastModified: lastModified ? new Date(lastModified) : undefined,
      };
    } catch {
      return null;
    }
  }

  private getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  }

  private getSignedHeaders(method: string, key: string, payload = ''): Record<string, string> {
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);
    const region = this.config.region || 'auto';
    const service = 's3';

    const host = this.getHost();
    const path = this.config.endpoint ? `/${this.config.bucket}/${key}` : `/${key}`;
    const payloadHash = crypto.createHash('sha256').update(payload).digest('hex');

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(this.config.secretAccessKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      Host: host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authorization,
    };
  }
}
