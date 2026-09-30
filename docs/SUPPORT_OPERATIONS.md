# Support Operations & Help Desk Runbook (Phase F)

## 1. Domain Architecture & Persistence

Support requests in FretFlow are managed as persistent, transactional PostgreSQL entities:

- **`SupportTicket`**:
  - `id`: Internal UUID primary key.
  - `ticketNumber`: Human-readable identifier format (`SUP-YYYY-XXXXXX`).
  - `userId`: Author learner foreign key (Zero-Trust IDOR anchor).
  - `category`: Bounded enum (`AUDIO_DSP`, `CURRICULUM`, `ACCOUNT`, `CONTENT_BUG`, `GENERAL`).
  - `priority`: Authoritative staff priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
  - `status`: State machine enum (`OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED`, `CLOSED`).
  - `assignedToId`: Staff member assigned to investigate (`SUPPORT`, `ADMIN`, or `OWNER`).
  - `telemetry`: Strictly bounded client troubleshooting attributes.
  - `firstResponseAt`: Timestamp set on the first public staff reply.
  - `resolvedAt` & `closedAt`: Resolution and closure lifecycle timestamps.

- **`SupportMessage`**:
  - Public bidirectional messages between the learner and support staff.
  - Immutable once created.

- **`SupportInternalNote`** (Segregated Table):
  - Stored in a separate table (`SupportInternalNote`) rather than a boolean column on public messages.
  - **Critical Invariant**: Learner APIs never query, serialize, or expose internal staff deliberations.
  - Internal note creation triggers zero notifications and zero emails to the student.

---

## 2. Authorization & RBAC Boundaries

| Action | Allowed Roles | Policy / Condition |
|---|---|---|
| Create Ticket | `LEARNER`, `SUPPORT`, `ADMIN`, `OWNER` | Rate limited (5 / min). Bounded telemetry. |
| View Own Ticket | `LEARNER` | Strict IDOR: `ticket.userId === session.id`. |
| Reply to Own Ticket | `LEARNER` | Allowed unless status is `CLOSED`. Auto-transitions `WAITING_USER` to `IN_PROGRESS`. |
| View Support Queue | `SUPPORT`, `ADMIN`, `OWNER` | Requires `support.read` permission. `CONTENT_EDITOR` is explicitly denied. |
| View Ticket (Staff) | `SUPPORT`, `ADMIN`, `OWNER` | Requires `support.read`. Returns messages + internal notes. |
| Assign / Unassign | `SUPPORT`, `ADMIN`, `OWNER` | Requires `support.update`. Logged to `AdminAuditLog`. |
| Update Priority | `SUPPORT`, `ADMIN`, `OWNER` | Requires `support.update`. Logged to `AdminAuditLog`. |
| Public Staff Reply | `SUPPORT`, `ADMIN`, `OWNER` | Requires `support.update`. Sets `firstResponseAt` if null. Triggers learner notification. |
| Add Internal Note | `SUPPORT`, `ADMIN`, `OWNER` | Requires `support.update`. Never notifies learner. Body omitted from audit log. |
| Status Transition | `SUPPORT`, `ADMIN`, `OWNER` | Enforces state machine transition matrix. Logged to `AdminAuditLog`. |

---

## 3. Formal State Machine

```
      [ OPEN ] ──────────────────────┐
         │                           │
         ▼                           ▼
  [ IN_PROGRESS ] ──────────► [ RESOLVED ] ────► [ CLOSED ]
     ▲       │                       │
     │       ▼                       ▼
   [ WAITING_USER ]               [ OPEN ] (Reopened)
```

- **Disallowed Transitions**:
  - `OPEN` directly to `CLOSED` (rejected).
  - `CLOSED` to any state (terminal; user must open a new ticket).
- **Auto-Transitions**:
  - When learner replies while ticket is in `WAITING_USER`, the system auto-transitions status to `IN_PROGRESS`.
  - When learner replies while ticket is in `RESOLVED`, the ticket is reopened to `OPEN`.

---

## 4. Audit Logging Invariant

All privileged staff mutations are recorded to `AdminAuditLog`:
- `SUPPORT_TICKET_ASSIGNED` / `SUPPORT_TICKET_UNASSIGNED`
- `SUPPORT_TICKET_PRIORITY_CHANGED`
- `SUPPORT_INTERNAL_NOTE_ADDED`
- `SUPPORT_TICKET_STATUS_CHANGED`
- `SUPPORT_TICKET_RESOLVED`
- `SUPPORT_TICKET_CLOSED`

**Privacy Invariant**: Audit records for internal notes and messages NEVER include the raw text content or secrets in `before`/`after` JSON payloads. Only entity IDs and actor IDs are recorded.

---

## 5. Diagnostic Telemetry & Privacy Policy

The client auto-diagnostics payload collected during ticket submission is strictly bounded:
- `userAgent`: Max 300 chars, sanitized.
- `audioSampleRate`: Integer between 0 and 384,000 Hz.
- `audioContextState`: String up to 50 chars (`running`, `suspended`, `interrupted`).
- `platform`: OS indicator (`macOS`, `Windows`, `iOS`, `Android`).
- `screenResolution`: Window viewport size for UI responsiveness triage.

**Prohibitions**:
- No raw audio waveforms, autocorrelation buffers, or microphone audio recordings are ever stored or transmitted.
- No hardware serial numbers, MAC addresses, or fingerprinting cookies are collected.
