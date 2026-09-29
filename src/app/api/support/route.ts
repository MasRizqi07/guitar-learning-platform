import { NextRequest } from 'next/server';
import { supportService } from '@/services/support.service';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const tickets = supportService.getAll();
    return apiSuccess({ tickets });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const session = await getSessionUser();

    const studentName = body.studentName || session?.name || 'Guest Learner';
    const studentEmail = body.studentEmail || session?.email || 'learner@fretflow.id';
    const experienceLevel = body.experienceLevel || 'Beginner';
    const category = body.category || 'AUDIO_DSP';
    const priority = body.priority || 'MEDIUM';
    const title = body.title || 'Support Request';
    const description = body.description || '';
    const telemetry = body.telemetry || {
      userAgent: req.headers.get('user-agent') || 'Unknown User Agent',
    };

    const created = supportService.create({
      studentName,
      studentEmail,
      experienceLevel,
      category,
      priority,
      status: 'OPEN',
      title,
      description,
      assignedStaff: null,
      telemetry,
    });

    return apiSuccess({ ticket: created });
  } catch (error) {
    return apiError(error);
  }
}
