# Content Operations & CMS Architecture (Phase C)

## 1. Overview & Operational Principles

The **Guitar Learning Platform Content Management System (CMS)** empowers non-developer staff (Content Editors, Administrators, Platform Owners) to create, curate, review, publish, and restore curriculum without editing source code or writing manual database seed scripts.

### Core Invariants:
1. **Preserve Learner Progression**: Mutations to published curriculum, sections, or quizzes must never corrupt or orphan learner-owned records:
   - `LessonProgress`
   - `PracticeSession`
   - `QuizAttempt` & `QuizAttemptAnswer`
   - `XPTransaction` ledgers
2. **Authoritative PostgreSQL Database**: All learner pages and admin CMS operations read and write to the same canonical database using Prisma ORM.
3. **Additive Status Transition**: The canonical status is governed by `ContentStatus` (`DRAFT`, `IN_REVIEW`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`). The legacy boolean `published` is maintained synchronously:
   - `status === PUBLISHED` &rarr; `published = true`
   - `status !== PUBLISHED` &rarr; `published = false`

---

## 2. Content Role Matrix & RBAC Policy

The platform enforces strict server-side permission checks on all CMS mutations:

| Role | Read CMS | Create Draft | Edit Draft | Submit Review | Staff Preview | Approve / Publish | Archive | Restore Revision | Manage Quizzes | Manage Chords | Manage Achievements |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **LEARNER** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **SUPPORT** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **CONTENT_EDITOR** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ *(No Self-Approval)* | ❌ | ❌ | ✅ *(Draft)* | ✅ | ❌ |
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **OWNER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Self-Approval Policy
To prevent unreviewed accidental publications:
- Users with the `CONTENT_EDITOR` role cannot approve or publish their own submitted content or any content directly.
- Only users with `ADMIN` or `OWNER` roles have the authority to transition content from `IN_REVIEW` to `PUBLISHED`.

---

## 3. Content Lifecycle & State Machine

```
      [ CREATE ]
          │
          ▼
       ┌──────┐
       │ DRAFT │ ◄─────────────────────┐
       └──┬───┘                        │
          │ (Submit Review)            │ (Restore Revision /
          ▼                             │  Reject to Draft)
     ┌───────────┐                     │
     │ IN_REVIEW │                     │
     └──┬────────┘                     │
        │ (Approve & Publish           │
        │   by Admin/Owner)            │
        ▼                              │
    ┌───────────┐                      │
    │ PUBLISHED ├───────(Archive)──────┤
    └──┬────────┘                      │
       │ (Edit & Republish)            │
       ▼                               │
[ New LessonRevision Created ]         │
                                       ▼
                                 ┌──────────┐
                                 │ ARCHIVED │
                                 └──────────┘
```

### Valid Status Transitions:
- `DRAFT` &rarr; `IN_REVIEW` (when content editor finishes drafting)
- `IN_REVIEW` &rarr; `PUBLISHED` (requires `ADMIN` or `OWNER`)
- `IN_REVIEW` &rarr; `DRAFT` (changes requested)
- `PUBLISHED` &rarr; `ARCHIVED` (unpublishes content; sets `published = false`)
- `ARCHIVED` &rarr; `DRAFT` (requires revision restore or deliberate unarchiving)
- *Direct `ARCHIVED` &rarr; `PUBLISHED` without review/restore semantics is strictly forbidden.*

---

## 4. Lesson Revision System & Restore Semantics

Whenever a previously published lesson is republished, a snapshot of its complete learner-facing content is archived into `LessonRevision`:
- **Version Number**: Monotonically increasing per lesson (1, 2, 3...).
- **Content Snapshot (`snapshot: Json`)**:
  - Full lesson metadata (title, slug, description, difficulty, estimated minutes, XP reward).
  - All ordered `LessonSection[]` items.
  - Attached `Quiz` metadata, questions, and answer options.
  - *Learner attempt data is NEVER stored in revision snapshots.*

### Restore Workflow:
1. Staff member navigates to `/admin/lessons/[id]/revisions`.
2. Selects a target historical version and confirms restore.
3. The system creates an automatic safety backup revision of the current lesson state.
4. Restores all sections, content, and quiz definitions to match the historical snapshot.
5. Sets the lesson status to `DRAFT` (requiring staff review before going live).
6. Writes an audit record (`LESSON_REVISION_RESTORED`).

---

## 5. Quiz History Integrity & Question Protection

Historical quiz attempts represent verified user progress and XP ledger history.

### The Question Deletion Invariant:
- In `prisma/schema.prisma`, `QuizAttemptAnswer.questionId` enforces `onDelete: Restrict`.
- When an editor saves a quiz through `/admin/quizzes/[id]`:
  - `AdminContentService.updateQuiz` checks whether any deleted question has existing answers recorded in `QuizAttemptAnswer`.
  - If attempts exist, the mutation is blocked with error `QUESTION_IN_USE`:
    > *"Cannot delete question ... because learners have already submitted attempts for it."*
- Updating question prompts, explanations, or adding new questions remains allowed and does not recalculate or invalidate past attempts.

---

## 6. Concurrency Protection (Optimistic Concurrency)

To prevent simultaneous editors from silently overwriting each other's changes:
1. CMS forms load the content's authoritative `updatedAt` timestamp (`clientUpdatedAt`).
2. When submitting updates (`PUT /api/admin/lessons/[id]`, `/api/admin/courses/[id]`, etc.), the client passes `clientUpdatedAt`.
3. If the record in the database was modified after `clientUpdatedAt`:
   - The server throws `AppError.conflict('CONTENT_CONFLICT', 'This content was updated by another editor. Refresh before saving.')`.
   - The editor UI presents a distinct amber conflict banner with a "Refresh Now" action.

---

## 7. Audit Logging

Every privileged CMS operation logs a structured record in `AdminAuditLog`:
- Actions: `COURSE_CREATED`, `COURSE_UPDATED`, `COURSE_PUBLISHED`, `COURSE_ARCHIVED`, `MODULE_CREATED`, `MODULE_UPDATED`, `MODULE_REORDERED`, `LESSON_CREATED`, `LESSON_UPDATED`, `LESSON_SUBMITTED_REVIEW`, `LESSON_PUBLISHED`, `LESSON_ARCHIVED`, `LESSON_REVISION_RESTORED`, `QUIZ_UPDATED`, `CHORD_CREATED`, `CHORD_UPDATED`, `ACHIEVEMENT_CREATED`, `ACHIEVEMENT_UPDATED`.
- Log records capture `adminId`, target entity ID, IP address, user agent, and a diff of modified fields with sensitive data scrubbed.
