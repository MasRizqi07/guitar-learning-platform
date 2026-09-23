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

## 7. Known Limitations & Future Hardening

1. **Email Verification:** Registration does not currently require email confirmation tokens. Recommended for future iterations if public open registration experiences spam.
2. **Password Reset Flow:** Forgot password / password reset via email is currently documented as an excluded MVP feature.
3. **Edge Rate Limiting:** For ultra-high-volume traffic, implementing Vercel Edge Middleware with `@upstash/ratelimit` on `/api/auth/login` is recommended.

---

## 8. Responsible Vulnerability Disclosure

If you discover a potential security vulnerability in this project, please report it privately:
- **Email:** `security@yourdomain.com` (placeholder)
- Please allow up to 48 hours for an acknowledgment before disclosing publicly.
