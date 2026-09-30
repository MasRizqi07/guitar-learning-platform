# Backoffice & Admin Operations Runbook

This guide covers operational workflows, administrative procedures, and backoffice tools for the **Guitar Learning Platform**.

---

## 1. Initial Platform Owner Bootstrap

To safely provision the initial platform `OWNER` without exposing public HTTP setup endpoints or committing credentials into source control, the platform provides a dedicated CLI bootstrap tool.

### Command

```bash
npm run admin:bootstrap-owner -- --email=<owner-email@domain.com>
```

### Options

| Flag | Description | Default |
| :--- | :--- | :--- |
| `--email=<email>` | **(Required)** Email of the target account to promote or create | None (`INITIAL_OWNER_EMAIL` env) |
| `--password=<pass>` | Initial password if a new account must be created | `INITIAL_OWNER_PASSWORD` env or `OwnerBootstrap2026!` |
| `--name=<name>` | Full name if creating a new account | `Platform Owner` |
| `--help`, `-h` | Display command usage and flag descriptions | N/A |

### Audit & Invariants
- If the account already exists, its role is upgraded to `OWNER` and status verified as `ACTIVE`.
- An audit record `BOOTSTRAP_OWNER_PROMOTION` is written to `AdminAuditLog` recording the promotion timestamp and actor.
- This command is designed for local provisioning, CI/CD pipeline initialization, or direct production container console execution.

---

## 2. Admin Workspace Navigation

Authorized staff access the operational console at `/admin`:

```text
/admin
├── Overview (/admin)
│   ├── Total Accounts & Active Learners metrics
│   ├── Suspended & Banned Account statistics
│   ├── Recent registrations timeline
│   └── High-priority security events
│
├── User Directory (/admin/users)
│   ├── Full-text search (name, email)
│   ├── Filters (Role, Status, Verification State)
│   ├── Bounded server-side pagination (10 to 100 items per page)
│   └── Sorting by Created Date, Name, Email
│
├── User Detail Diagnostics (/admin/users/[id])
│   ├── Account Overview (Name, Email, Role, Status, Creation Date)
│   ├── Security Diagnostics (Active sessions, Security events, IP hashes)
│   ├── Learning Progress Diagnostic (Level, XP, Streaks, Lessons completed)
│   └── Mutation Actions:
│       ├── Change Role Modal
│       ├── Suspend Account Modal (Reason mandatory)
│       └── Unsuspend Account Modal
│
└── Audit Log Inspection (/admin/audit)
    ├── Filter by Action (e.g. USER_SUSPENDED, USER_ROLE_CHANGED)
    ├── Filter by Entity Type (e.g. User, Lesson)
    ├── Date Range Filtering
    └── State Diff Inspection Modal (Sanitized before/after JSON diffs)
```

---

## 3. Audit Log Architecture & Data Privacy

The `AdminAuditLog` service enforces strict data isolation and append-only immutability.

### Privacy Guarantees
1. **Zero Secret Leakage:** The `AdminAuditService.sanitizePayload()` pipeline scrubs any payload field matching:
   - `password`, `passwordHash`, `token`, `tokenHash`, `secret`, `authorization`, `cookie`, `jwt`.
2. **IP Anonymization:** Raw IP addresses are **never** persisted in the audit log. The system computes a 64-character SHA-256 cryptographic digest (`ipHash`), allowing correlation of malicious requests without retaining sensitive personally identifiable network coordinates.
3. **Append-Only Immutability:** The service layer provides **no** delete, edit, or purge methods. Records are permanently stored for compliance and tamper resistance.

---

## 4. Backoffice Route Security Boundary

Access to the `(admin)` route group is guarded by server-side authorization in `src/app/(admin)/admin/layout.tsx`:

```ts
const actor = await requireAuthUser();
if (!['SUPPORT', 'CONTENT_EDITOR', 'ADMIN', 'OWNER'].includes(normalizeRole(actor.role))) {
  redirect('/dashboard');
}
```

Any unauthorized request (such as a standard `LEARNER` attempting to access `/admin`) is immediately redirected to `/dashboard` before any sensitive backoffice templates or data queries are executed.

---

## 5. Curriculum Content Management (CMS) Workspace (Phase C)

The platform includes a production Content Management System allowing authorized staff (`CONTENT_EDITOR`, `ADMIN`, `OWNER`) to manage curriculum without code changes:

```text
/admin
├── Content Overview (/admin/content)
│   ├── Real-time publishing metrics (Draft, In Review, Scheduled, Published, Archived)
│   └── Quick access cards for Courses, Modules, Lessons, Quizzes, Chords, and Achievements
│
├── Course Management (/admin/courses)
│   ├── Create, edit, and archive courses
│   └── Manage slugs, difficulty, order, and thumbnail URLs
│
├── Module Management (/admin/modules)
│   ├── Create, edit, and reorder modules within courses
│   └── Collision-free transactional reordering
│
├── Lesson CMS (/admin/lessons)
│   ├── Multi-section lesson authoring (Text, Video, Image, Chord, Tip, Warning, Practice, Summary)
│   ├── Draft & Review editorial workflows
│   ├── Staff-only learner preview (`/admin/lessons/[id]/preview`)
│   └── Monotonically incremented revision history & safe snapshot restoration (`/admin/lessons/[id]/revisions`)
│
├── Quiz CMS (/admin/quizzes)
│   ├── Create and edit lesson quizzes, questions, and answer options
│   └── Invariant: `QUESTION_IN_USE` protects historical learner attempts from deletion
│
├── Chord Library (/admin/chords)
│   ├── Interactive visual diagram editing with real-time ChordDiagram previews
│   └── Fret, finger, string, and note data validation
│
└── Gamification & Achievements (/admin/achievements)
    ├── Manage badges, XP rewards, and unlocking condition criteria
    └── Stable code identifier enforcement
```

---

## 6. Owner Console & Platform Governance Boundary (Phase E)

Platform governance, executive product analytics, dynamic feature flags, and emergency maintenance mode are partitioned into a dedicated, strictly isolated surface at `/owner`. 

`ADMIN` and lower roles are strictly forbidden from accessing `/owner` or `/api/owner/*` (returning `403 OWNER_ACCESS_REQUIRED`). 

For complete documentation on executive metrics, cohort retention, feature flags, and system settings, refer to:
- [`docs/OWNER_OPERATIONS.md`](OWNER_OPERATIONS.md)
- [`docs/ANALYTICS_DEFINITIONS.md`](ANALYTICS_DEFINITIONS.md)

---

## 7. Support & Customer Care Operations (Phase F)

Customer support agents (`SUPPORT`), administrators (`ADMIN`), and platform custodians (`OWNER`) manage learner requests via the live database support console at `/admin/support`:

- **Live Database Queue**: Real-time filtering by status (`OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED`), priority, category, unassigned status, and search query.
- **Assignment**: Staff can claim tickets ("Assign to Me") or unassign tickets with audit logging.
- **Public Replies & First-Response Tracking**: Staff replies record `firstResponseAt` on the first public response and dispatch learner notifications/transactional emails.
- **Segregated Internal Notes**: Staff internal notes are stored in a dedicated `SupportInternalNote` table, never accessible or leaked to learner API responses.
- **Authoritative Priority & State Transitions**: Strictly enforced state machine transitions with automated audit trail logging.

For complete documentation on support operations, state machines, and email outbox delivery, see:
- [`docs/SUPPORT_OPERATIONS.md`](SUPPORT_OPERATIONS.md)
- [`docs/NOTIFICATION_OPERATIONS.md`](NOTIFICATION_OPERATIONS.md)

