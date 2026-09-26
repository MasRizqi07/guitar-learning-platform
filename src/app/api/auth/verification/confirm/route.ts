import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { emailVerificationConfirmSchema } from '@/validations/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = emailVerificationConfirmSchema.parse(body);

    const result = await AuthService.confirmEmailVerification(validated.token, req.headers);
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
