import { NextRequest } from 'next/server';
import { SupportService } from '@/services/support.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { SupportTicketStatus, SupportTicketPriority, SupportCategory } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to access support staff queue');
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
    const status = searchParams.get('status') as SupportTicketStatus | 'ALL' | null;
    const priority = searchParams.get('priority') as SupportTicketPriority | 'ALL' | null;
    const category = searchParams.get('category') as SupportCategory | 'ALL' | null;
    const assignedToId = searchParams.get('assignedToId') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await SupportService.getStaffQueue(session, {
      page,
      pageSize,
      status: status || undefined,
      priority: priority || undefined,
      category: category || undefined,
      assignedToId,
      search,
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
