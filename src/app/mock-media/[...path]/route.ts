import { NextRequest, NextResponse } from 'next/server';
import { StorageService } from '@/services/storage/storage.service';
import { MockStorageProvider } from '@/services/storage/providers/mock-storage.provider';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolved = await params;
  const key = resolved.path.join('/');

  const provider = StorageService.getProvider();
  if (provider instanceof MockStorageProvider) {
    const meta = await provider.getObjectMetadata(key);
    // Return a 1x1 transparent PNG or SVG fallback if not found in mock store
    const fallbackBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    return new NextResponse(fallbackBuffer, {
      headers: {
        'Content-Type': meta?.contentType || 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  return NextResponse.json({ error: 'Mock media endpoint only available in mock storage mode' }, { status: 404 });
}
