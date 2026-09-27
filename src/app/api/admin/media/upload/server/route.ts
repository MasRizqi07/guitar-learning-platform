import { NextRequest } from 'next/server';
import { requireAuthUser } from '@/lib/auth';
import { StorageService } from '@/services/storage/storage.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { AppError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  try {
    const actor = await requireAuthUser();
    const contentType = req.headers.get('content-type') || '';

    let fileBuffer: Buffer;
    let filename: string;
    let mimeType: string;
    let altText: string | undefined;
    let caption: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        throw new AppError('BAD_REQUEST', 'No file provided in form data', 400);
      }

      const fileObj = file as File;
      filename = fileObj.name;
      mimeType = fileObj.type || 'application/octet-stream';
      altText = (formData.get('altText') as string) || undefined;
      caption = (formData.get('caption') as string) || undefined;

      const arrayBuffer = await fileObj.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      // JSON with base64 payload
      const body = await req.json();
      if (!body.fileBase64 || !body.filename || !body.mimeType) {
        throw new AppError('BAD_REQUEST', 'Required fields: fileBase64, filename, mimeType', 400);
      }
      filename = body.filename;
      mimeType = body.mimeType;
      altText = body.altText || undefined;
      caption = body.caption || undefined;
      fileBuffer = Buffer.from(body.fileBase64, 'base64');
    }

    const asset = await StorageService.uploadServerBuffer(
      {
        id: actor.id,
        role: actor.role,
        email: actor.email,
        name: actor.name,
      },
      fileBuffer,
      filename,
      mimeType,
      { altText, caption }
    );

    return apiSuccess(asset, 201);
  } catch (error) {
    return apiError(error);
  }
}
