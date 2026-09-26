# GUITAR LEARNING PLATFORM
# PRODUCTION PLATFORM V2

**Document Type:** Product Requirements + Technical Architecture Blueprint  
**Baseline:** Existing `MasRizqi07/guitar-learning-platform` repository  
**Architecture Strategy:** Evolve existing Modular Monolith  
**Primary Goal:** Transform learner-focused application into an operational production platform  
**Target Release:** v2 foundation / post-v1 production evolution

---

# 1. Executive Summary

The current application already provides a strong learner-facing foundation:

```text
Authentication
Onboarding
Dashboard
Curriculum
Lessons
Practice
Quiz
Progress
XP
Streak
Achievements
Chord Library
Interactive Fretboard
Guitar Tuner
```

The next evolution is not primarily about adding more learner features.

The next requirement is making the platform operable as a real product.

Production Platform v2 introduces four product surfaces:

```text
┌──────────────────────────────────────────────┐
│            PUBLIC APPLICATION                │
│ Landing / Legal / Help / Auth                │
├──────────────────────────────────────────────┤
│              LEARNER APP                     │
│ Learn / Practice / Quiz / Progress           │
├──────────────────────────────────────────────┤
│             OPERATIONS APP                   │
│ Admin / Content / Support                    │
├──────────────────────────────────────────────┤
│               OWNER APP                      │
│ Analytics / Health / Governance              │
└──────────────────────────────────────────────┘
```

Core objective:

> A non-developer should be able to operate, maintain, publish content, support users, monitor performance, and administer the platform without editing source code or the database manually.

---

# 2. Current Repository Baseline

The existing repository already uses:

```text
Next.js 16 App Router
React 19
TypeScript strict
Tailwind CSS
PostgreSQL
Prisma 6
Zod
Custom bcrypt + HMAC session authentication
Vitest
Playwright
Web Audio API
```

Existing architecture:

```text
Presentation
↓
Application / Route Handlers
↓
Domain
↓
Services
↓
Repositories
↓
Prisma
↓
PostgreSQL
```

This architecture should be preserved.

Do NOT migrate to microservices.

---

# 3. Current Important Gaps

The repository currently has only:

```text
USER
ADMIN
```

as user roles.

However there is no complete operational application for:

```text
Owner
Content Editor
Support Staff
Admin
```

The current authentication system also does not yet provide complete real-user account lifecycle capabilities such as:

```text
Email verification
Forgot password
Reset password
Per-device sessions
Logout all devices
Account deletion
Data export
Account suspension
```

Current curriculum management remains developer-oriented.

Production Platform v2 must close these gaps.

---

# 4. Product Actors

## 4.1 Learner

Uses the educational platform.

Responsibilities:

```text
Learn
Practice
Complete quizzes
Track progress
Manage profile
Manage own account
```

---

## 4.2 Content Editor

Maintains educational content.

Can:

```text
Create course drafts
Edit modules
Edit lessons
Create quizzes
Manage chord content
Upload media
Preview content
Submit content for review
```

Cannot:

```text
Manage platform security
Change user roles
Delete users
Modify infrastructure settings
```

---

## 4.3 Support Staff

Handles learner operational problems.

Can:

```text
Search users
View limited account state
View support tickets
Resolve account issues
Suspend abusive accounts if authorized
Review user-visible progress diagnostics
```

Cannot edit learning content.

---

## 4.4 Admin

Operates the platform.

Can:

```text
Manage users
Manage curriculum
Manage support
Publish content
Review audit logs
Manage achievements
Perform authorized XP adjustment
```

---

## 4.5 Owner

Highest operational authority.

Can:

```text
Access product analytics
Manage administrators
Review platform health
Review audit history
Manage feature flags
Review growth / retention
Manage platform-level configuration
```

---

# 5. RBAC Architecture

Replace:

```text
USER
ADMIN
```

with:

```text
LEARNER
CONTENT_EDITOR
SUPPORT
ADMIN
OWNER
```

Recommended authorization architecture:

```text
User Role
↓
Role Policy
↓
Permissions
↓
Resource + Action
```

Example permission catalog:

```text
course.read
course.create
course.update
course.publish

lesson.read
lesson.create
lesson.update
lesson.publish

quiz.create
quiz.update

media.create
media.delete

user.read
user.update
user.suspend
user.delete

support.read
support.update

analytics.read

audit.read

feature_flag.read
feature_flag.manage

role.manage

system.manage
```

Do not implement authorization by scattering:

```ts
user.role === "ADMIN"
```

through the application.

Create centralized helpers:

```text
hasPermission()
requirePermission()
requireRole()
```

---

# 6. Application Surfaces

Final route families:

```text
PUBLIC

/
 /login
 /register
 /verify-email
 /forgot-password
 /reset-password
 /help
 /faq
 /contact
 /privacy
 /terms


LEARNER

/dashboard
/learn
/lessons/*
/practice
/tuner
/library
/progress
/profile
/settings/security
/notifications


ADMIN

/admin
/admin/users
/admin/content
/admin/courses
/admin/modules
/admin/lessons
/admin/quizzes
/admin/chords
/admin/media
/admin/achievements
/admin/support
/admin/audit


OWNER

/owner
/owner/analytics
/owner/users
/owner/content
/owner/system
/owner/audit
/owner/features
```

Admin and owner use distinct layouts from the learner app.

---

# 7. Production Account Lifecycle

## 7.1 Registration

New flow:

```text
Register
↓
Account Created
↓
Verification Email Sent
↓
Verify Email
↓
Onboarding
↓
Dashboard
```

Unverified accounts may have restricted access.

---

# 8. Email Verification

Introduce:

```text
EmailVerificationToken
```

Fields:

```text
id
userId
tokenHash
expiresAt
consumedAt
createdAt
```

Rules:

```text
token generated with crypto-secure random bytes
store token hash only
single use
expiration
invalidate previous token when appropriate
```

Endpoints:

```text
POST /api/auth/verification/send
POST /api/auth/verification/confirm
```

---

# 9. Password Recovery

Introduce:

```text
PasswordResetToken
```

Fields:

```text
id
userId
tokenHash
expiresAt
consumedAt
createdAt
```

Flow:

```text
Forgot Password
↓
Generic Response
↓
Email Reset Link
↓
Validate Token
↓
Choose New Password
↓
Invalidate All Existing Sessions
```

Never reveal whether an email exists.

---

# 10. Persistent Session Management

The current signed-cookie architecture is functional but does not provide complete per-device revocation.

Production v2 introduces:

```text
Session
```

Recommended fields:

```text
id
userId
tokenHash
userAgent
ipHash
createdAt
lastSeenAt
expiresAt
revokedAt
```

Cookie contains an opaque cryptographically random session token.

Database stores:

```text
SHA-256(token)
```

Never plaintext session token.

Capabilities:

```text
Current Device
Other Sessions
Logout Device
Logout All Devices
Automatic Expiration
Session Revocation
```

Route:

```text
/settings/security
```

---

# 11. Account Security Events

Introduce:

```text
SecurityEvent
```

Examples:

```text
LOGIN_SUCCESS
LOGIN_FAILED
PASSWORD_CHANGED
PASSWORD_RESET
EMAIL_CHANGED
SESSION_REVOKED
ACCOUNT_SUSPENDED
```

Useful for:

```text
security investigation
user security history
abuse detection
```

---

# 12. Account Status

Introduce:

```text
AccountStatus

ACTIVE
SUSPENDED
BANNED
DELETION_PENDING
DELETED
```

User authentication must validate account status.

Suspended/banned users may not create sessions.

---

# 13. Account Deletion

User flow:

```text
Settings
↓
Delete Account
↓
Password Confirmation
↓
Explicit Confirmation
↓
Deletion Pending
↓
Deletion / anonymization
```

Decide retention based on legal/business requirements.

Never rely on admins manually deleting records from PostgreSQL.

---

# 14. User Data Export

Route:

```text
/settings/data
```

Provide export containing appropriate user-owned information:

```text
profile
learning goals
lesson progress
practice history
quiz results
achievements
account metadata
```

Do not expose password hashes or security secrets.

---

# 15. Authentication Rate Limiting

Production v2 should remove the currently accepted distributed rate-limit risk.

Use a shared store such as:

```text
Upstash Redis
```

Protect:

```text
POST /api/auth/login
POST /api/auth/register
POST /api/auth/verification/send
POST /api/auth/password-reset/request
```

Key strategy may combine:

```text
IP
+
normalized account identifier
```

Avoid IP-only policies.

---

# 16. Admin Application

Create:

```text
src/app/(admin)/
```

Admin layout:

```text
Sidebar
Topbar
Breadcrumb
Main Content
```

Main navigation:

```text
Overview
Users
Content
Courses
Lessons
Quizzes
Chords
Media
Achievements
Support
Audit Log
```

---

# 17. Admin Dashboard

`/admin`

Display operational data:

```text
Total users
New registrations
Active learners
Open support tickets
Draft content
Pending reviews
Recently published lessons
Failed system operations
```

Admin dashboard is operational.

Owner dashboard is analytical.

Keep them separate.

---

# 18. Content Management System

Create CRUD management for:

```text
Course
Module
Lesson
LessonSection
Quiz
Question
AnswerOption
Chord
Achievement
```

All mutations:

```text
authentication
authorization
Zod validation
audit log
transaction where required
```

---

# 19. Content Publishing Workflow

Replace simple boolean-only publishing workflow with:

```text
ContentStatus

DRAFT
IN_REVIEW
SCHEDULED
PUBLISHED
ARCHIVED
```

Recommended fields:

```text
status
publishedAt
scheduledFor
createdById
updatedById
```

Do not automatically expose drafts to learners.

---

# 20. Lesson Editing Workflow

Admin interface:

```text
Lesson Details

Title
Slug
Description
Difficulty
Estimated Time
XP Reward

↓

Lesson Sections

TEXT
VIDEO
IMAGE
CHORD
TIP
WARNING
PRACTICE
SUMMARY

↓

Quiz

↓

Preview

↓

Submit for Review

↓

Publish
```

Drag/drop reorder may be implemented after basic reliable ordering works.

---

# 21. Content Preview

Content editors need:

```text
/admin/lessons/[id]/preview
```

Preview should render the same learner components but bypass learner progression logic safely for authorized staff.

Draft content must never become public through accidental API caching.

---

# 22. Content Versioning

Introduce:

```text
LessonRevision
```

Suggested schema:

```text
id
lessonId
version
snapshot Json
createdById
createdAt
publishedAt
```

Snapshot includes:

```text
lesson metadata
sections
quiz
questions
answers
```

Capabilities:

```text
Compare revisions
Restore revision
See publishing history
```

Never overwrite production learning content with no recovery path.

---

# 23. Course Version Strategy

Initially keep `Course` and `Module` relational structure unchanged.

Do not introduce complex immutable course graph versioning unless needed.

Use revisions for high-risk lesson content first.

Expand later if requirements demand.

---

# 24. Media Management

Introduce:

```text
MediaAsset
```

Fields:

```text
id
type
provider
storageKey
url
mimeType
sizeBytes
width
height
durationSeconds
uploadedById
createdAt
deletedAt
```

Use object storage:

```text
Cloudflare R2
Cloudinary
Supabase Storage
S3-compatible provider
```

Do not store binary media in PostgreSQL.

---

# 25. Admin Media Library

Route:

```text
/admin/media
```

Capabilities:

```text
Upload
Preview
Search
Filter
Copy URL
Attach to lesson
Delete unused asset
```

Deletion must verify asset references.

---

# 26. Admin User Management

Route:

```text
/admin/users
```

Capabilities:

```text
Search users
Filter status
View profile
View account status
View high-level learning state
Suspend account
Unsuspend account
Reset learner progression only with explicit privileged workflow
Change role when authorized
```

Dangerous operations require confirmation.

---

# 27. Owner Console

Create:

```text
src/app/(owner)/
```

Owner dashboard focuses on:

```text
Product growth
Activation
Engagement
Retention
Learning performance
Content effectiveness
Operational health
```

---

# 28. Owner KPI Dashboard

Suggested KPI:

```text
Total Registered Users
Verified Users
Daily Active Users
Weekly Active Users
Monthly Active Users

Registration → Verification
Verification → Onboarding
Onboarding → Lesson 1 Start
Lesson 1 Start → Lesson 1 Complete

Average Practice Minutes
Quiz Pass Rate
Course Completion Rate

D1 Retention
D7 Retention
D30 Retention
```

---

# 29. Learning Funnel

Owner analytics:

```text
Registered
↓
Email Verified
↓
Onboarding Completed
↓
First Lesson Started
↓
First Lesson Completed
↓
Returned Day 7
↓
Completed Module 1
```

This funnel should drive product decisions.

---

# 30. Content Performance Analytics

Provide:

```text
Lesson start count
Lesson completion count
Completion rate
Average completion time
Quiz failure rate
Practice difficulty feedback
Drop-off rate
```

Useful questions:

```text
Which lesson loses the most learners?

Which quiz is unusually difficult?

Which chord causes repeated difficulty feedback?
```

---

# 31. Analytics Architecture

Keep two layers.

## Internal Transactional Records

Existing:

```text
LearningActivity
LessonProgress
PracticeSession
QuizAttempt
XPTransaction
```

These remain authoritative.

## Behavioral Analytics

Introduce:

```text
PostHog
```

or equivalent.

Track events:

```text
user_registered
email_verified
onboarding_completed
lesson_started
lesson_completed
practice_started
practice_completed
quiz_started
quiz_completed
daily_goal_completed
achievement_unlocked
```

Do not use analytics events as the source of truth for XP or learning progression.

---

# 32. Support System

Introduce:

```text
SupportTicket
```

Fields:

```text
id
userId
category
subject
message
status
priority
assignedToId
createdAt
updatedAt
resolvedAt
```

Enums:

```text
TicketStatus

OPEN
IN_PROGRESS
WAITING_USER
RESOLVED
CLOSED
```

---

# 33. Learner Support Routes

```text
/help
/faq
/contact
/feedback
```

Authenticated feedback should attach:

```text
user ID
route
app version
optional diagnostic context
```

Never attach secrets.

---

# 34. Admin Support Routes

```text
/admin/support
/admin/support/[ticketId]
```

Capabilities:

```text
Assign ticket
Set priority
Reply
Add internal notes
Resolve
Close
```

---

# 35. Notification System

Introduce:

```text
Notification
```

Examples:

```text
ACHIEVEMENT
LESSON_AVAILABLE
COURSE_UPDATE
SECURITY
SYSTEM
```

Fields:

```text
id
userId
type
title
message
actionUrl
readAt
createdAt
```

Route:

```text
/notifications
```

---

# 36. Transactional Email

Use a provider such as:

```text
Resend
Postmark
AWS SES
```

Email types:

```text
Verify Email
Password Reset
Security Alert
Important Account Notification
```

Do not send emails synchronously from critical DB transactions where failure would corrupt business state.

---

# 37. Admin Audit Logging

Existing `LearningActivity` must remain learner-oriented.

Introduce separate:

```text
AdminAuditLog
```

Fields:

```text
id
actorUserId
action
entityType
entityId
before Json?
after Json?
ipHash
userAgent
createdAt
```

Examples:

```text
USER_SUSPENDED
USER_ROLE_CHANGED
COURSE_CREATED
LESSON_UPDATED
LESSON_PUBLISHED
ACHIEVEMENT_CHANGED
XP_ADMIN_ADJUSTMENT
```

---

# 38. Owner Audit View

Route:

```text
/owner/audit
```

Filters:

```text
Actor
Action
Entity
Date
```

Audit logs should be append-only from normal application operations.

---

# 39. Feature Flags

Introduce:

```text
FeatureFlag
```

Fields:

```text
key
enabled
rolloutPercentage
config Json?
updatedById
updatedAt
```

Examples:

```text
ADAPTIVE_LEARNING
EAR_TRAINING
NEW_PROGRESS_UI
AI_TUTOR
```

Initial rollout system can be deterministic by user ID hash.

---

# 40. Platform Configuration

Introduce:

```text
PlatformSetting
```

Suitable for low-risk dynamic configuration:

```text
maintenance mode
registration enabled
default daily goal
support email
```

Do NOT store secrets in this table.

---

# 41. Maintenance Mode

Owner can activate:

```text
Maintenance Mode
```

Public status:

```text
Learning platform is undergoing maintenance.
```

Allow OWNER access during maintenance.

---

# 42. Observability

Production v2 requires:

```text
Sentry
Structured logs
Request correlation IDs
Release version
Environment metadata
```

Monitor:

```text
API error rate
P95 response latency
DB latency
Authentication failures
Lesson completion failures
Quiz submit failures
```

---

# 43. Error Monitoring

Sentry must scrub:

```text
password
passwordHash
session token
verification token
reset token
DATABASE_URL
AUTH_SECRET
```

Attach:

```text
release SHA
environment
route
error code
```

---

# 44. CI/CD

Create:

```text
.github/workflows/ci.yml
```

Pipeline:

```text
npm ci
↓
lint
↓
typecheck
↓
unit tests
↓
integration tests
↓
production build
```

Playwright may run in a dedicated job.

---

# 45. Git Governance

Protect primary branch.

Recommended:

```text
Pull Request Required
Required CI
No force push
No direct destructive changes
```

Feature workflow:

```text
feature/*
↓
PR
↓
CI
↓
Preview
↓
Review
↓
Merge
```

---

# 46. Preview Environment

Each PR should have:

```text
Preview deployment
```

Preview must not mutate production DB.

Use dedicated:

```text
Preview database
```

or safe isolation strategy.

---

# 47. Environment Model

Support:

```text
development
test
preview
production
```

Separate credentials.

Never share production DB credentials with automated PR previews.

---

# 48. Backup & Recovery

Production database requirements:

```text
Managed backups
Point-in-time recovery where plan supports it
Restore procedure
Restore testing
```

Document:

```text
RPO
RTO
```

even if initial values are simple.

---

# 49. Legal & Privacy

Public pages:

```text
/privacy
/terms
```

Document:

```text
what data is stored
why it is stored
retention
account deletion
analytics usage
```

If non-essential cookies/analytics are introduced, implement appropriate consent handling for applicable jurisdictions.

---

# 50. Data Retention

Define retention for:

```text
password reset tokens
verification tokens
revoked sessions
support tickets
audit logs
deleted accounts
analytics
```

Expired sensitive tokens should be purged periodically.

---

# 51. Database Additions

Expected new models:

```text
Session
EmailVerificationToken
PasswordResetToken
SecurityEvent

MediaAsset
LessonRevision

SupportTicket
Notification

AdminAuditLog

FeatureFlag
PlatformSetting
```

Potential later models:

```text
Skill
LessonSkill
UserSkillProgress
Organization
OrganizationMember
Subscription
```

Do NOT add future models before their phase.

---

# 52. Recommended Updated User Model

Conceptually:

```text
User

id
name
email
emailVerified
passwordHash

role
status

createdAt
updatedAt

profile
sessions
securityEvents
tickets
notifications
adminActions
```

---

# 53. Migration Safety

Do NOT rewrite the original migration.

Create additive migrations.

Examples:

```text
add_account_lifecycle
add_rbac
add_content_workflow
add_operations
```

Existing production learner records must remain valid.

---

# 54. Production Compatibility

Existing learners must preserve:

```text
LessonProgress
PracticeSession
QuizAttempt
XPTransaction
UserAchievement
LearningActivity
```

No destructive reset.

No re-seeding user-owned data.

---

# 55. API Structure

New families:

```text
/api/auth/verify-email/*
/api/auth/password-reset/*
/api/auth/sessions/*

/api/admin/users/*
/api/admin/content/*
/api/admin/media/*
/api/admin/support/*
/api/admin/audit/*

/api/owner/analytics/*
/api/owner/features/*
/api/owner/system/*
```

All admin/owner endpoints must use server-side RBAC.

---

# 56. API Response Standard

Keep existing typed API response conventions.

Failure:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action."
  }
}
```

Never leak Prisma or stack errors.

---

# 57. New Error Codes

Examples:

```text
EMAIL_NOT_VERIFIED
TOKEN_INVALID
TOKEN_EXPIRED
SESSION_REVOKED

ACCOUNT_SUSPENDED

PERMISSION_DENIED

CONTENT_NOT_FOUND
CONTENT_NOT_PUBLISHABLE

MEDIA_IN_USE

TICKET_NOT_FOUND

FEATURE_DISABLED
```

---

# 58. Security Invariants

The following must remain true:

```text
Client never chooses authenticated user ID.

Client never awards XP.

Client never calculates authoritative quiz score.

Client cannot unlock lessons.

Client cannot publish curriculum.

Client cannot elevate its own role.

Admin cannot perform owner-only operations.

Content editor cannot manage users.

Support cannot edit curriculum.
```

---

# 59. Dangerous Operations

Require explicit server-side confirmation for:

```text
Delete user
Change privileged role
Publish major curriculum change
Admin XP adjustment
Delete referenced media
Restore old content revision
```

All must write audit records.

---

# 60. Testing Strategy v2

Maintain existing tests.

Add:

## Unit

```text
RBAC policies
token expiration
feature rollout
content publish rules
```

## Integration

```text
email verification
password reset
session revocation
admin permissions
owner permissions
content CRUD
content publication
audit records
support lifecycle
```

## E2E

```text
Learner Golden Path
Account Recovery
Admin Content Publishing
Owner Analytics Access
Support Ticket Resolution
```

---

# 61. Security Tests

Explicitly test:

```text
Learner cannot access /admin.

Admin cannot access owner-only actions.

Content Editor cannot suspend users.

Support cannot publish lessons.

Expired reset token rejected.

Used verification token rejected.

Revoked session rejected.

Account suspension terminates access.

Role cannot be supplied by client.

Admin CRUD creates audit entries.
```

---

# 62. Production Operational Definition of Done

The platform is operationally production-grade when:

```text
Users can recover accounts.

Users can verify identity.

Admins can operate without database access.

Content editors can publish safely.

Owner can measure the product.

Support can resolve user problems.

Security actions are auditable.

Application failures are observable.

Rate limiting protects public auth surfaces.

Deployment has automated quality gates.

Production data is backed up and recoverable.
```

---

# 63. Implementation Phases

## PHASE A — Account & Security Foundation

```text
Role expansion
Persistent sessions
Email verification
Password recovery
Security events
Account status
Distributed rate limiting
```

Gate:

```text
complete account lifecycle works end-to-end
```

---

## PHASE B — Admin Foundation

```text
RBAC permission engine
Admin route group
Admin layout
User management
Admin audit log
```

Gate:

```text
unauthorized role escalation impossible
```

---

## PHASE C — Content Operations

```text
Course CMS
Module CMS
Lesson CMS
Quiz CMS
Chord CMS
Content statuses
Lesson revision system
Content preview
```

Gate:

```text
editor can draft → review → publish without developer intervention
```

---

## PHASE D — Media & Publishing

```text
Object storage
MediaAsset
Media library
Safe deletion
Publishing scheduler
```

---

## PHASE E — Owner Operations

```text
Owner console
KPIs
Funnels
Content analytics
Feature flags
Platform settings
```

---

## PHASE F — Support & Notifications

```text
Help center
Feedback
Support tickets
Admin support inbox
Notifications
Transactional emails
```

---

## PHASE G — Observability & Delivery

```text
Sentry
PostHog
Correlation IDs
GitHub Actions
Branch protection documentation
Preview environment
Backup/restore runbook
Legal pages
```

---

# 64. Post-v2 Learning Evolution

Only after operational platform completion:

```text
Skill Model
Adaptive Learning
Ear Training
PWA Offline
Advanced Audio Feedback
AI Tutor
```

---

# 65. Future B2B Layer

If institutions become customers:

```text
Organization
OrganizationMember
Cohort
Instructor
Enrollment
Assignment
```

Do NOT model `CLIENT` as just another global UserRole.

Client organizations require tenant/domain modeling.

---

# 66. Final v2 Architecture

```text
                         ┌───────────────────┐
                         │     Public Web     │
                         └─────────┬─────────┘
                                   │
         ┌─────────────────────────┼──────────────────────────┐
         │                         │                          │
         ▼                         ▼                          ▼
┌────────────────┐       ┌────────────────┐        ┌────────────────┐
│  Learner App   │       │   Admin App    │        │   Owner App    │
└───────┬────────┘       └───────┬────────┘        └───────┬────────┘
        │                        │                         │
        └────────────────────────┼─────────────────────────┘
                                 ▼
                     ┌────────────────────────┐
                     │ Next.js Application    │
                     │ Modular Monolith       │
                     └────────────┬───────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
      Domain                  Services                Policies/RBAC
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                           Repository Layer
                                  │
                                  ▼
                              Prisma
                                  │
                                  ▼
                            PostgreSQL

External:

Object Storage
Redis Rate Limiter
Transactional Email
Sentry
PostHog
```

---

# 67. Strategic Rule

Production v2 prioritizes:

```text
OPERABILITY
SECURITY
CONTENT GOVERNANCE
USER SUPPORT
OBSERVABILITY
```

before:

```text
AI
SOCIAL FEATURES
MONETIZATION
ADVANCED GAMIFICATION
```

The platform should first become easy and safe to operate.

Then it should become more intelligent.