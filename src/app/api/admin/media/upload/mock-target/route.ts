import { NextRequest, NextResponse } from 'next/server';
import { MockStorageProvider } from '@/services/storage/providers/mock-storage.provider';

export async function POST(req: NextRequest) {
  return handleMockUpload(req);
}

export async function PUT(req: NextRequest) {
  return handleMockUpload(req);
}

async function handleMockUpload(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'Missing storage key' }, { status: 400 });
  }

  const mimeType = req.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await req.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const mock = new MockStorageProvider();
  await mock.uploadBuffer(key, buffer, mimeType);

  return NextResponse.json({ success: true, key });
}
