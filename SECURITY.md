# 🛡️ Application Security & Hardening Policy

This document outlines the security architecture, data isolation guarantees, threat mitigation controls, and vulnerability disclosure policies for the **Guitar Learning Platform for Beginners**.

---

## 1. Security Architecture & Threat Model

```text
User Request (HTTPS)
       │
       ▼
Security Response Headers (CSP, HSTS, X-Frame-Options, Permissions-Policy)
       │
       ▼
Encrypted Cookie Verification (`glp_session` HMAC SHA-256)
       │
       ▼
Application Boundary (`requireAuthUser()`)
       │
       ├── Multi-Tenant Isolation (userId extracted exclusively from session)
       ├── Anti-Cheat Validation (Server-side duration and timestamp verification)
       ├── Quiz Answer Secrecy (`isCorrect` stripped prior to client response)
       └── Idempotent Ledger Enforcement (`XPTransaction.idempotencyKey` UNIQUE)
       │
       ▼
Database Transaction Boundary (`prisma.$transaction`)
```

---

## 2. Authentication & Session Security

- **Password Hashing:** Passwords are never stored in plaintext. They are hashed using `bcrypt` with a work factor of 10 salt rounds (`bcrypt.hash(password, 10)`).
- **Session Tokens:** Sessions use HMAC SHA-256 cryptographic signatures generated via the Web Crypto API (`crypto.subtle`). The payload includes `sub` (User ID), `iat` (issued at), and `exp` (30-day expiration).
- **Cookie Attributes:**
  - `httpOnly`: `true` (Inaccessible to client JavaScript, mitigating XSS session theft).
  - `secure`: `true` in production (Transmitted exclusively over TLS/HTTPS).
  - `sameSite`: `lax` (Protects against Cross-Site Request Forgery (CSRF) while allowing legitimate top-level navigation).
  - `path`: `/`

---

## 3. Multi-Tenant Isolation & IDOR Protection

- **Session-Derived Ownership:** Every authenticated mutation and query derives the user identity strictly from `await requireAuthUser()`.
- **Zero Client Trust:** Any client-supplied `userId` in query parameters or JSON bodies is discarded.
- **Verification Tests:** Automated regression tests in `tests/integration/security-idor.test.ts` continuously verify:
  - User A cannot view, submit, or manipulate User B's quiz attempts.
  - User A cannot alter User B's lesson progress.
  - User A cannot record practice sessions or credit XP to User B's account.

---

## 4. Anti-Cheat & Gamification Integrity

- **Minimum Practice Thresholds:** To prevent automated script/farming exploits:
  - Lesson Practice: $\ge 60\text{ seconds}$
  - Chord Practice: $\ge 120\text{ seconds}$
  - Daily Practice: $\ge 300\text{ seconds}$
  Sessions failing to meet these thresholds are recorded as `isValid: false` and award $0\text{ XP}$.
- **XP Idempotency Keys:** Every XP grant writes to an immutable ledger (`XPTransaction`) with a strict unique constraint on `idempotencyKey`:
  - Lesson Completion: `lesson-completed:${userId}:${lessonId}`
  - Quiz Completion: `quiz-completed:${userId}:${quizId}`
  - Daily Goal: `daily-goal:${userId}:${YYYY-MM-DD}`
  Network retries, page refreshes, or concurrent double-clicks trigger a database unique collision, ensuring XP is granted exactly once.

---

## 5. Quiz Secrecy & Scoring Authority

- **Answer Stripping:** When starting a quiz (`/api/quizzes/[id]/start`), the server explicitly strips all `isCorrect` booleans and explanation fields from the response payload.
- **Server Calculation:** The user submits only `{ questionId, selectedOptionId }[]`. The server compares these against stored answer keys inside an atomic transaction, computes the percentage score, and determines passing status ($\ge 60\%$).

---

## 6. Production Security Response Headers

Configured in `next.config.ts` for all application routes:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking attacks |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits leakage of referrer URLs |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Enforces HTTPS connections |
| `Permissions-Policy` | `camera=(), microphone=(self), geolocation=()` | Restricts microphone access exclusively to the origin |

---

## 7. Account Security, Sessions & Rate Limiting (Phase A)

- **Persistent Revocable Sessions:** Sessions are stored in the PostgreSQL `Session` table indexed by SHA-256 token hashes (`tokenHash`). Raw session secrets are never persisted in the database.
- **Per-Device Revocation:** Users can view active devices and revoke individual or all non-current sessions from `/settings/security`.
- **Email Verification:** Unverified accounts receive cryptographically secure SHA-256 single-use tokens expiring in 24 hours, with a 60-second re-request cooldown.
- **Password Recovery:** Password reset tokens are single-use, hashed with SHA-256, expire in 1 hour, and atomically revoke all active sessions upon successful reset.
- **Distributed Rate Limiting:** In-memory distributed rate limiter with sliding window protects against brute-force attacks on login (5 attempts / 15m), registration (3 attempts / hour), and password resets.

---

## 8. Role-Based Access Control & Operational Security (Phase B)

- **Server-Authoritative Enforcement:** Every administrative operation enforces permissions server-side using `requirePermission(actor, permission)`.
- **Privilege Separation:** 5 roles (`LEARNER`, `CONTENT_EDITOR`, `SUPPORT`, `ADMIN`, `OWNER`) define granular operational boundaries.
- **Administrative Invariants:**
  - `CANNOT_SUSPEND_SELF`: Prevents staff from locking themselves out.
  - `LAST_OWNER_PROTECTED`: Guarantees that at least one active `OWNER` exists at all times; demoting or suspending the sole owner is blocked.
  - Non-owner administrators cannot touch `OWNER` status or promote accounts to `OWNER`.
- **Session Revocation on Suspension:** Suspending a user immediately revokes all active database sessions (`revokedAt = now()`), terminating in-flight requests.
- **Immutable Audit Trail:** All administrative mutations write to `AdminAuditLog`. The service is strictly append-only, hashes IP addresses using SHA-256, and scrubs sensitive keys (passwords, tokens, cookies, secrets) before persistence.

---

## 9. Responsible Vulnerability Disclosure

If you discover a potential security vulnerability in this project, please report it privately:
- **Email:** `security@yourdomain.com` (placeholder)
- Please allow up to 48 hours for an acknowledgment before disclosing publicly.
