import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { registerSchema } from '@/validations/auth';
import { setSessionCookie } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = registerSchema.parse(body);
    const user = await AuthService.register(validated);

    await setSessionCookie(user);

    return apiSuccess({ user, message: 'Account created successfully' }, 201);
  } catch (error) {
    return apiError(error);
  }
}
