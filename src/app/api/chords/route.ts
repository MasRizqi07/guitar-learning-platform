import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { ChordType } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const typeParam = searchParams.get('type');
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};

    if (typeParam && typeParam !== 'ALL') {
      if (Object.values(ChordType).includes(typeParam as ChordType)) {
        where.type = typeParam as ChordType;
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { has: search.toUpperCase() } },
      ];
    }

    const chords = await prisma.chord.findMany({
      where,
      orderBy: [{ difficulty: 'asc' }, { name: 'asc' }],
    });

    return apiSuccess(chords);
  } catch (error) {
    return apiError(error);
  }
}
