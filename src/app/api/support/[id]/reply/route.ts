import { NextRequest } from 'next/server';
import { supportService } from '@/services/support.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const session = await getSessionUser();

    const senderName = body.senderName || session?.name || 'Staff Support';
    const senderRole = body.senderRole || (session?.role && ['ADMIN', 'SUPPORT', 'OWNER'].includes(session.role) ? 'STAFF' : 'STUDENT');
    const content = body.content;
    const isInternal = Boolean(body.isInternal);

    if (!content || !content.trim()) {
      throw AppError.validation('Message content cannot be blank.');
    }

    const updated = supportService.addMessage(id, {
      senderName,
      senderRole,
      content,
      isInternal,
    });

    if (!updated) {
      throw AppError.notFound('CONTENT_NOT_FOUND', `Ticket ${id} not found.`);
    }


    return apiSuccess({ ticket: updated });
  } catch (error) {
    return apiError(error);
  }
}
