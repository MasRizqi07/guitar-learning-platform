# Role-Based Access Control (RBAC) Specification

This document details the multi-tenant Role-Based Access Control (RBAC) architecture, permission engine, security invariants, and operational policies governing the **Guitar Learning Platform**.

---

## 1. Role Hierarchy & Principles

The platform defines five distinct product and operational roles:

| Role | Operational Scope | Access Boundary | UI Access |
| :--- | :--- | :--- | :--- |
| **`LEARNER`** | Regular student studying guitar. Consumes curriculum, practices chords, takes quizzes, earns XP. | Learner application only. Cannot access backoffice APIs. | `/(app)` |
| **`CONTENT_EDITOR`** | Curriculum author and instructional designer. Creates and updates lessons, chords, and media drafts. | Content management surfaces. No access to user directory, suspension, or roles. | `/(admin)` (Scoped) |
| **`SUPPORT`** | Front-line customer support and trust & safety staff. Diagnoses learner account issues and handles suspensions. | Read-only diagnostic access to learner profiles, session counts, security events; account suspension/unsuspension. No curriculum publishing or role modification. | `/(admin)` (Scoped) |
| **`ADMIN`** | Operations manager and platform administrator. Oversees user accounts, manages non-privileged roles, reviews audit trail, publishes curriculum. | Full operational administration. Cannot manage `OWNER` accounts or promote users to `OWNER`. | `/(admin)` |
| **`OWNER`** | Platform executives, system custodians, and technical founders. Full authority across all platform resources and configuration. | Unrestricted platform control. Governed only by self-protection and `LAST_OWNER_PROTECTED` invariants. | `/(admin)` |

---

## 2. Comprehensive Permission Matrix

| Permission | `LEARNER` | `CONTENT_EDITOR` | `SUPPORT` | `ADMIN` | `OWNER` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `course.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `course.create` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `course.update` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `course.publish` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `lesson.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `lesson.create` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `lesson.update` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `lesson.publish` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `quiz.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `quiz.create` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `quiz.update` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `media.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `media.create` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `media.delete` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `user.read` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `user.update` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `user.suspend` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `user.delete` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `role.manage` | ❌ | ❌ | ❌ | ✅* | ✅ |
| `audit.read` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `analytics.read` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `feature_flag.read` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `feature_flag.manage` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `system.manage` | ❌ | ❌ | ❌ | ❌ | ✅ |

*\* `ADMIN` role management authority is strictly restricted to non-privileged roles (`LEARNER`, `CONTENT_EDITOR`, `SUPPORT`). Only `OWNER` can grant or revoke `OWNER` status.*

---

## 3. Server-Authoritative Security Invariants

All security decisions are executed server-side. The UI dynamically toggles elements for convenience, but every API route and backend service validates permissions explicitly before execution.

```text
Incoming Mutation
       │
       ▼
Session Authentication (`requireAuthUser()`)
       │
       ▼
Permission Verification (`requirePermission(actor, permission)`)
       │
       ▼
Business Invariant Checks:
   ├── Self-Protection Invariant (`actor.id !== targetUser.id`)
   ├── Owner-Isolation Invariant (`actor.role === 'OWNER'` for OWNER targets)
   └── Last-Owner-Protected Invariant (`countActiveOwners() > 1`)
       │
       ▼
Atomic Database Transaction (`prisma.$transaction`)
       │
       ├── State Mutation
       ├── Security Event Log (`SecurityEvent`)
       └── Immutable Audit Log (`AdminAuditLog`)
```

### Invariant Rules:

1. **`CANNOT_SUSPEND_SELF`**
   - An administrator cannot suspend their own account via administrative actions.
   - Prevents accidental lockout of active administrators.

2. **`ROLE_CHANGE_FORBIDDEN`**
   - A user cannot change their own role under any circumstances.
   - Non-owner actors cannot promote any user to `OWNER`.
   - Non-owner actors cannot demote an `OWNER`.

3. **`LAST_OWNER_PROTECTED`**
   - The platform strictly enforces that at least **one active `OWNER` account** must always exist.
   - Demoting or suspending the final remaining active `OWNER` is rejected with error code `LAST_OWNER_PROTECTED`.

---

## 4. Operational Suspension Semantics

Account suspension represents immediate administrative revocation of access:

1. **Reason Mandate:** A non-empty explanation (minimum 3 characters, maximum 500 characters) is required.
2. **Session Revocation:** All active database-backed persistent sessions (`Session` table) for the target user are atomically set to `revokedAt = now()`. Any in-flight requests using existing session tokens are rejected immediately.
3. **Audit Trail:**
   - A `SecurityEvent` record of type `ACCOUNT_SUSPENDED` is written with target user metadata.
   - An `AdminAuditLog` record of action `USER_SUSPENDED` is recorded capturing the actor ID, sanitized previous state, and new state.

### Unsuspension Semantics:
- Account status transitions from `SUSPENDED` back to `ACTIVE`.
- Existing sessions are **not** reactivated; the user must authenticate afresh.
- A `SecurityEvent` of type `ACCOUNT_UNSUSPENDED` and an `AdminAuditLog` of action `USER_UNSUSPENDED` are written.
