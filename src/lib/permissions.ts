import { AppError } from './errors';

export type UserRole = 'LEARNER' | 'CONTENT_EDITOR' | 'SUPPORT' | 'ADMIN' | 'OWNER' | 'USER';

export type Permission =
  | 'course.read'
  | 'course.create'
  | 'course.update'
  | 'course.publish'
  | 'lesson.read'
  | 'lesson.create'
  | 'lesson.update'
  | 'lesson.publish'
  | 'quiz.read'
  | 'quiz.create'
  | 'quiz.update'
  | 'media.read'
  | 'media.create'
  | 'media.delete'
  | 'user.read'
  | 'user.update'
  | 'user.suspend'
  | 'user.delete'
  | 'support.read'
  | 'support.update'
  | 'analytics.read'
  | 'audit.read'
  | 'feature_flag.read'
  | 'feature_flag.manage'
  | 'role.manage'
  | 'system.manage';

// Role -> Permissions Mapping
const ROLE_PERMISSIONS: Record<string, ReadonlySet<Permission>> = {
  LEARNER: new Set<Permission>([
    'course.read',
    'lesson.read',
    'quiz.read',
    'media.read',
  ]),
  // Legacy USER maps identically to LEARNER
  USER: new Set<Permission>([
    'course.read',
    'lesson.read',
    'quiz.read',
    'media.read',
  ]),
  CONTENT_EDITOR: new Set<Permission>([
    'course.read',
    'course.create',
    'course.update',
    'lesson.read',
    'lesson.create',
    'lesson.update',
    'quiz.read',
    'quiz.create',
    'quiz.update',
    'media.read',
    'media.create',
    'media.delete',
  ]),
  SUPPORT: new Set<Permission>([
    'course.read',
    'lesson.read',
    'quiz.read',
    'media.read',
    'user.read',
    'user.suspend',
    'support.read',
    'support.update',
    'audit.read',
  ]),
  ADMIN: new Set<Permission>([
    // Learner + Content Editor + Support + Admin
    'course.read',
    'course.create',
    'course.update',
    'course.publish',
    'lesson.read',
    'lesson.create',
    'lesson.update',
    'lesson.publish',
    'quiz.read',
    'quiz.create',
    'quiz.update',
    'media.read',
    'media.create',
    'media.delete',
    'user.read',
    'user.update',
    'user.suspend',
    'support.read',
    'support.update',
    'analytics.read',
    'audit.read',
    'feature_flag.read',
  ]),
  OWNER: new Set<Permission>([
    // All permissions
    'course.read',
    'course.create',
    'course.update',
    'course.publish',
    'lesson.read',
    'lesson.create',
    'lesson.update',
    'lesson.publish',
    'quiz.read',
    'quiz.create',
    'quiz.update',
    'media.read',
    'media.create',
    'media.delete',
    'user.read',
    'user.update',
    'user.suspend',
    'user.delete',
    'support.read',
    'support.update',
    'analytics.read',
    'audit.read',
    'feature_flag.read',
    'feature_flag.manage',
    'role.manage',
    'system.manage',
  ]),
};

/**
 * Normalizes role string to canonical uppercase or fallback
 */
export function normalizeRole(role?: string | null): UserRole {
  if (!role) return 'LEARNER';
  const upper = role.toUpperCase();
  if (upper === 'USER') return 'LEARNER';
  if (['LEARNER', 'CONTENT_EDITOR', 'SUPPORT', 'ADMIN', 'OWNER'].includes(upper)) {
    return upper as UserRole;
  }
  return 'LEARNER';
}

/**
 * Checks if a given role has a specific permission
 */
export function hasPermission(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const canonicalRole = normalizeRole(role);
  const permissions = ROLE_PERMISSIONS[canonicalRole] || ROLE_PERMISSIONS[role];
  return permissions ? permissions.has(permission) : false;
}

/**
 * Validates that a user object has the requested permission, throwing AppError.forbidden if not
 */
export function requirePermission(
  user: { role?: string | null; id?: string },
  permission: Permission
): void {
  if (!user || !user.role) {
    throw AppError.unauthorized('Authentication required to verify permissions');
  }
  if (!hasPermission(user.role, permission)) {
    throw AppError.forbidden(
      `Access denied. Required permission: ${permission} is not granted for role: ${user.role}`
    );
  }
}

/**
 * Validates that a user has one of the allowed roles, throwing AppError.forbidden if not
 */
export function requireRole(
  user: { role?: string | null; id?: string },
  allowedRoles: UserRole[]
): void {
  if (!user || !user.role) {
    throw AppError.unauthorized('Authentication required');
  }
  const canonical = normalizeRole(user.role);
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  if (!normalizedAllowed.includes(canonical)) {
    throw AppError.forbidden(
      `Access denied. Allowed roles: [${allowedRoles.join(', ')}]. Current role: ${user.role}`
    );
  }
}
