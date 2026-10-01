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

## 9. Content Security & Integrity Controls (Phase C)

- **Self-Approval Prevention:** `CONTENT_EDITOR` accounts can draft curriculum and submit for review, but are structurally blocked from publishing their own content or bypassing peer review. Only `ADMIN` and `OWNER` roles can publish or archive live curriculum.
- **Learner Answer Protection:** Quiz answers (`isCorrect`) are strictly stripped from all learner-facing responses prior to submission (`LearnerQuizDTO`), preventing client-side inspection or devtools cheating.
- **Historical Question Protection (`onDelete: Restrict`):** Questions with existing learner `QuizAttemptAnswer` records cannot be deleted. Any attempt to remove an in-use question throws a `QUESTION_IN_USE` error, preventing destruction of historical quiz records.
- **Optimistic Concurrency Protection:** CMS mutations validate `clientUpdatedAt` against the database row timestamp. Stale concurrent edits are rejected with `CONTENT_CONFLICT` (HTTP 409), preventing editors from silently overwriting each other's changes.
- **Staff-Only Preview Mode:** Content previews at `/admin/lessons/[id]/preview` require active staff session authentication and the `lesson.read` permission. Previews never write to learner progress tables.

---

## 10. Media Management & Storage Security (Phase D)

- **Zero Storage Secret Exposure**: Cloud object storage credentials (AWS Access Key ID, Secret Access Key, R2 API tokens) are strictly server-side environment variables and are never transmitted to the browser or client-side bundles.
- **Short-Lived Signed Upload Targets**: When uploading, the client requests a signed PUT URL that is valid for 15 minutes, tightly bound to a specific server-generated storage key, MIME type, and size limit.
- **MIME Allowlist & Rejection of Active Formats**: Only verified, safe media types are permitted (`image/jpeg`, `image/png`, `image/webp`, `audio/mpeg`, `audio/wav`, `audio/ogg`, `video/mp4`, `video/webm`, `application/pdf`). SVG (`image/svg+xml`) is explicitly disallowed to prevent script execution / XSS vulnerabilities.
- **Path Traversal Protection**: Client filenames are never used as storage keys. Keys are generated using server-side random UUIDs and normalized extensions (`media/{yyyy}/{mm}/{uuid}.{ext}`).
- **Reference-Guarded Deletions**: Assets actively referenced by courses or lesson sections cannot be deleted (`409 MEDIA_IN_USE`), eliminating broken links and dangling references across public curriculum.
- **Compensating Failure Recovery**: Storage provider deletion failures mark the asset `FAILED` rather than presenting false success, preventing database/cloud storage divergence.

---

## 11. Owner Console, Analytics & Governance Security (Phase E)

- **Absolute Owner Boundary:** The `/owner/**` route group and `/api/owner/**` endpoints strictly require `role = OWNER`. Non-owner roles (including `ADMIN`, `CONTENT_EDITOR`, `SUPPORT`, and `LEARNER`) are rejected with HTTP 403 `OWNER_ACCESS_REQUIRED`.
- **Zero Secrets in Platform Settings:** The `PlatformSetting` model explicitly forbids storing system secrets (`AUTH_SECRET`, `DATABASE_URL`, storage tokens, provider API keys). All secrets remain strictly managed via server environment variables.
- **Behavioral Analytics Privacy & PII Scrubbing:** Product analytics dispatching (`ProductAnalyticsService`) scrubs emails, passwords, session tokens, and IP addresses before transmitting events. Only pseudonymous internal identifiers and safe operational metadata are forwarded.
- **Authoritative Isolation:** External tracking failure (e.g. PostHog downtime or network timeout) is isolated in a non-blocking catch block and will **never** cause transactional failures in lesson completions, quiz submissions, or XP awards.
- **Maintenance Mode with Owner Override:** Activating `MAINTENANCE_MODE` returns HTTP 503 `MAINTENANCE_MODE` for learner and staff mutations while preserving uninterrupted access for `OWNER` accounts to safely manage platform recovery.

---

## 12. Support Operations & Notifications Security (Phase F)

- **Truthful Cryptographic Guarantees:** User passwords are encrypted exclusively using server-side `bcrypt` (10 rounds). The frontend password strength meter on the security settings surface is documented accurately as a client-side complexity heuristic and does not misrepresent server cryptographic algorithms.
- **Segregated Internal Notes Invariant:** Staff internal notes are partitioned into a physically separate table (`SupportInternalNote`). Invariant: Public learner ticket queries and serializers NEVER query or expose internal staff notes.
- **Zero-Trust Support & Notification IDOR Protection:**
  - Learner ticket access verifies `ticket.userId === session.id`.
  - Notification queries and mark-as-read mutations verify `notification.userId === session.id`.
  - Client-supplied user identifiers are completely ignored.
- **Privacy-Preserving Diagnostic Telemetry:** Audio diagnostics are strictly bounded (user-agent, sample rate, AudioContext state, platform, viewport size). No raw audio recordings or fingerprinting coordinates are ever collected or stored.
- **Non-Authoritative Outbox Delivery:** External email provider failures log non-fatal warnings and persist failure state in `NotificationDelivery` without rolling back tickets, replies, or user notifications.
- **Support Message XSS Safety:** All support ticket subjects and message contents are rendered with standard React text escaping, mitigating script injection attacks.
- **Private Attachment Policy:** Direct file attachments on support tickets remain disabled during Phase F to prevent inadvertent leakage into public curriculum asset buckets. Support attachments will only be enabled once private, isolated object storage with short-lived signed URLs is configured.

---

## 14. Observability, CI/CD & Production Governance (Phase G)

- **Automated Telemetry & Secret Scrubber:** `src/lib/scrubber.ts` intercepts all structured logs, diagnostic contexts, and error payloads, recursively redacting credentials, tokens, session hashes, database connection strings, bearer headers, and internal staff notes.
- **Request Correlation ID (`x-request-id`):** Incoming request IDs are validated in `src/middleware.ts` against safe alphanumeric format (`/^[a-zA-Z0-9\-_]{8,64}$/`) or regenerated using `crypto.randomUUID()`. Propagated to downstream context, API error envelopes, and response headers without leaking secrets.
- **Origin-Based CSRF Mitigation:** Authenticated mutating HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) with session cookies are validated in `src/middleware.ts` against the request `host`. Cross-origin browser forgeries are rejected with HTTP 403 `CSRF_ORIGIN_MISMATCH`.
- **Health vs Readiness Separation:**
  - `GET /api/health`: Public shallow process liveness probe returning `{ status: "ok" }`. Completely eliminates information disclosure (no database hostnames, uptime, or topology).
  - `GET /api/internal/readiness`: Protected deep operational probe verifying active PostgreSQL connectivity (`SELECT 1`), storage, and rate-limiting status. Strictly protected by dedicated `INTERNAL_OPS_TOKEN` or authenticated `ADMIN`/`OWNER` session (`AUTH_SECRET` is strictly rejected to preserve separation of duties).
- **User Data Portability & Deletion Lifecycle:**
  - `/api/profile/export`: Self-service GDPR-compliant JSON personal data download. Explicitly strips password hashes, internal staff notes, and session tokens.
  - `/api/profile/delete-request`: Rate-limited self-service account deletion request with password re-verification, transitioning account to `DELETION_PENDING`, revoking all active sessions, and logging an immutable security audit event.
- **Production Rate Limiting Fail-Closed:** Evaluates distributed limits via Upstash Redis REST. In production (`NODE_ENV=production`), missing Redis credentials fail closed with a configuration blocker, preventing silent fallback to process memory on multi-instance serverless deployments.

---

## 15. Responsible Vulnerability Disclosure

If you discover a potential security vulnerability in this project, please report it privately:
- **Email:** `security@fretflow.com`
- Please allow up to 48 hours for an acknowledgment before disclosing publicly.

