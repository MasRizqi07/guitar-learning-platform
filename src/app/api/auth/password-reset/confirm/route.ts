import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { passwordResetConfirmSchema } from '@/validations/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = passwordResetConfirmSchema.parse(body);

    const result = await AuthService.confirmPasswordReset(validated, req.headers);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
