import { UserRepository } from '@/repositories/user.repository';
import { hashPassword, verifyPassword, SessionUser } from '@/lib/auth';
import { AppError } from '@/lib/errors';
import { RegisterInput, LoginInput } from '@/validations/auth';

export class AuthService {
  static async register(input: RegisterInput): Promise<SessionUser> {
    const existing = await UserRepository.findByEmail(input.email);
    if (existing) {
      throw AppError.validation('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const created = await UserRepository.createUser({
      name: input.name,
      email: input.email,
      passwordHash,
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      role: created.role,
    };
  }

  static async login(input: LoginInput): Promise<SessionUser> {
    const user = await UserRepository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  static async getCurrentUser(userId: string) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('USER_NOT_FOUND', 'User not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profile: user.profile,
      onboardingCompleted: Boolean(user.onboardingProfile?.completed),
      onboarding: user.onboardingProfile,
    };
  }
}
