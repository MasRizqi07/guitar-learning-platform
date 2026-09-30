import { NextRequest } from 'next/server';
import { SupportService } from '@/services/support.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session?.id) {
      throw AppError.unauthorized('Authentication required to view staff ticket details');
    }

    const { id } = await params;
    const ticket = await SupportService.getStaffTicketDetail(session, id);

    return apiSuccess({ ticket });
  } catch (error) {
    return apiError(error);
  }
}
