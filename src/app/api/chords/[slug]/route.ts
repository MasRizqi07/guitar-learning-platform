import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { AppError } from '@/lib/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const chord = await prisma.chord.findUnique({
      where: { slug },
    });

    if (!chord) {
      throw AppError.notFound('INTERNAL_SERVER_ERROR', 'Chord not found');
    }

    return apiSuccess(chord);
  } catch (error) {
    return apiError(error);
  }
}
