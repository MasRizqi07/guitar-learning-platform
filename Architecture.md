# PHASE 0
# Software Architecture & Database Implementation Specification

**Product:** Guitar Learning Platform for Beginners  
**Document Type:** Technical Design Specification  
**Architecture:** Modular Monolith  
**Primary Platform:** Web Application  
**Status:** Implementation Baseline  
**Scope:** MVP

---

# 1. Tujuan Phase 0

Phase ini menetapkan fondasi teknis sebelum implementasi feature dimulai.

Output wajib:

```text
Architecture
Database Schema
Entity Relationship
Constraint
Index Strategy
Authorization
Business Rules
Transaction Boundaries
Service Structure
API Contract
Seed Strategy
Error Model
Testing Strategy
Deployment Foundation
```

Setelah Phase 0 selesai, developer seharusnya tidak lagi mempertanyakan:

> Data ini disimpan di mana?

> Siapa yang boleh mengakses endpoint ini?

> Bagaimana lesson dianggap selesai?

> Bagaimana XP diberikan?

> Bagaimana next lesson terbuka?

> Bagaimana streak dihitung?

Semua keputusan tersebut harus sudah deterministik.

---

# 2. Architecture Decision

## 2.1 Architecture Style

Gunakan:

> **Modular Monolith**

Jangan menggunakan microservices untuk MVP.

Alasan:

- domain masih relatif kecil,
- satu development team,
- deployment lebih sederhana,
- transaction lebih mudah,
- observability lebih mudah,
- operational overhead rendah,
- masih mudah diekstrak menjadi service terpisah di masa depan.

High-level architecture:

```text
Browser
   │
   ▼
Next.js Application
   │
   ├── Presentation Layer
   │
   ├── Application Layer
   │
   ├── Domain Services
   │
   ├── Repository Layer
   │
   ▼
Prisma ORM
   │
   ▼
PostgreSQL
```

External dependency:

```text
Application
 ├── Authentication Provider
 ├── Object Storage
 ├── Analytics
 └── Error Monitoring
```

---

# 3. Technology Baseline

Recommended stack:

```text
Frontend
Next.js
React
TypeScript
Tailwind CSS

Backend
Next.js Route Handlers
Server Actions where appropriate

Validation
Zod

Database
PostgreSQL

ORM
Prisma

Authentication
Auth.js

Testing
Vitest
React Testing Library
Playwright

Deployment
Vercel

Database Hosting
Neon PostgreSQL
or
Supabase PostgreSQL

Media Storage
Cloudinary
or
Supabase Storage

Monitoring
Sentry

Product Analytics
PostHog
```

Tidak perlu Redis pada MVP kecuali ditemukan bottleneck konkret.

---

# 4. Codebase Architecture

Struktur direkomendasikan:

```text
src/
│
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (onboarding)/
│   ├── (app)/
│   └── api/
│
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── curriculum/
│   ├── lessons/
│   ├── practice/
│   ├── quizzes/
│   ├── progress/
│   ├── gamification/
│   ├── chords/
│   └── profile/
│
├── components/
│   ├── ui/
│   └── shared/
│
├── services/
├── repositories/
├── validations/
├── lib/
├── hooks/
├── types/
└── config/
```

Setiap domain:

```text
features/lessons/
├── components/
├── actions/
├── services/
├── repositories/
├── schemas/
├── queries/
├── types/
└── constants/
```

---

# 5. Layer Responsibility

## Presentation Layer

Bertanggung jawab atas:

- rendering,
- form,
- loading state,
- validation feedback,
- interaction.

Tidak boleh menangani business rule penting.

---

## Application Layer

Mengorkestrasi use case.

Contoh:

```text
CompleteLessonUseCase
StartPracticeUseCase
SubmitQuizUseCase
CompleteOnboardingUseCase
```

---

## Domain Layer

Menangani business rules.

Contoh:

```text
CanCompleteLesson
CalculateQuizScore
CalculateStreak
AwardXP
DetermineLessonUnlock
```

---

## Repository Layer

Bertanggung jawab atas database access.

Contoh:

```text
UserRepository
LessonRepository
ProgressRepository
QuizRepository
PracticeRepository
```

UI tidak boleh langsung menjalankan query database.

---

# 6. Core Domain Model

Domain utama:

```text
Identity
Curriculum
Learning
Practice
Assessment
Progress
Gamification
Reference Content
```

Entity utama:

```text
User
Profile
OnboardingProfile
LearningGoal
Course
Module
Lesson
LessonSection
LessonProgress
PracticeSession
Quiz
Question
AnswerOption
QuizAttempt
QuizAttemptAnswer
Chord
Achievement
UserAchievement
XPTransaction
LearningActivity
```

---

# 7. Final ERD

```text
USER
│
├── PROFILE
│
├── ONBOARDING_PROFILE
│    └── USER_LEARNING_GOAL
│
├── LESSON_PROGRESS
│
├── PRACTICE_SESSION
│
├── QUIZ_ATTEMPT
│    └── QUIZ_ATTEMPT_ANSWER
│
├── XP_TRANSACTION
│
├── USER_ACHIEVEMENT
│
└── LEARNING_ACTIVITY


COURSE
│
└── MODULE
     │
     └── LESSON
          │
          ├── LESSON_SECTION
          ├── LESSON_PROGRESS
          ├── PRACTICE_SESSION
          │
          └── QUIZ
               │
               └── QUESTION
                    └── ANSWER_OPTION


ACHIEVEMENT
└── USER_ACHIEVEMENT


CHORD
└── PRACTICE_SESSION_CHORD
    └── PRACTICE_SESSION
```

---

# 8. User

```text
User
------------------------
id              UUID
name            VARCHAR
email           VARCHAR
emailVerified   TIMESTAMP?
passwordHash    VARCHAR?
role            ENUM
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

Role:

```text
USER
ADMIN
```

Future:

```text
INSTRUCTOR
```

Constraints:

```text
email UNIQUE
email NOT NULL
```

Indexes:

```text
INDEX(email)
INDEX(createdAt)
```

---

# 9. Profile

```text
Profile
------------------------
id                  UUID
userId              UUID
avatarUrl           VARCHAR?
currentLevel        INT
totalXP             INT
currentStreak       INT
longestStreak       INT
lastActiveDate      DATE?
timezone            VARCHAR
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

Constraint:

```text
userId UNIQUE
```

Default:

```text
currentLevel = 1
totalXP = 0
currentStreak = 0
longestStreak = 0
timezone = Asia/Jakarta
```

Timezone harus tetap menjadi property user agar sistem tidak hardcode Indonesia.

---

# 10. Onboarding Profile

```text
OnboardingProfile
------------------------
id                  UUID
userId              UUID
experienceLevel     ENUM
guitarType          ENUM
dailyGoalMinutes    INT
assessmentScore     INT?
recommendedLevel    ENUM
completed           BOOLEAN
completedAt         TIMESTAMP?
createdAt           TIMESTAMP
updatedAt           TIMESTAMP
```

Experience:

```text
ABSOLUTE_BEGINNER
BEGINNER
BASIC_PLAYER
INTERMEDIATE
```

Guitar type:

```text
ACOUSTIC
ELECTRIC
CLASSICAL
NO_GUITAR
```

Recommended level:

```text
BEGINNER_1
BEGINNER_2
BEGINNER_3
INTERMEDIATE_1
```

Constraint:

```text
userId UNIQUE
```

Daily goal:

```text
10
15
30
45
60
```

Server harus memvalidasi enum tersebut.

---

# 11. Learning Goal

Jangan simpan tujuan sebagai string bebas.

```text
LearningGoal
------------------------
id
code
name
description
```

Seed:

```text
PLAY_FAVORITE_SONGS
LEARN_FROM_ZERO
IMPROVE_CHORDS
IMPROVE_RHYTHM
UNDERSTAND_THEORY
BUILD_CONFIDENCE
```

Pivot:

```text
UserLearningGoal
------------------------
userId
learningGoalId
```

Composite unique:

```text
UNIQUE(userId, learningGoalId)
```

---

# 12. Course

```text
Course
------------------------
id
title
slug
description
difficulty
thumbnailUrl
order
published
createdAt
updatedAt
```

Constraints:

```text
slug UNIQUE
order UNIQUE
```

Untuk MVP:

```text
Beginner Guitar Fundamentals
```

sudah cukup sebagai satu course utama.

---

# 13. Module

```text
Module
------------------------
id
courseId
title
slug
description
order
estimatedMinutes
createdAt
updatedAt
```

Unique:

```text
UNIQUE(courseId, slug)
UNIQUE(courseId, order)
```

Indexes:

```text
INDEX(courseId)
INDEX(courseId, order)
```

---

# 14. Lesson

```text
Lesson
------------------------
id
moduleId
title
slug
description
difficulty
estimatedMinutes
xpReward
order
published
createdAt
updatedAt
```

Unique:

```text
UNIQUE(moduleId, slug)
UNIQUE(moduleId, order)
```

Indexes:

```text
INDEX(moduleId)
INDEX(moduleId, order)
INDEX(published)
```

---

# 15. Lesson Section

Lesson tidak disimpan sebagai satu body HTML.

Gunakan:

```text
LessonSection
------------------------
id
lessonId
type
title
content
mediaUrl
metadata JSONB
required
order
createdAt
updatedAt
```

Type:

```text
TEXT
VIDEO
IMAGE
CHORD
TIP
WARNING
PRACTICE
SUMMARY
```

Metadata dapat menyimpan:

```json
{
  "duration": 120,
  "chord": "C_MAJOR"
}
```

Constraint:

```text
UNIQUE(lessonId, order)
```

---

# 16. Lesson Progress

```text
LessonProgress
------------------------
id
userId
lessonId
status
currentSectionOrder
progressPercentage
startedAt
lastAccessedAt
completedAt
createdAt
updatedAt
```

Status:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Critical constraint:

```text
UNIQUE(userId, lessonId)
```

Index:

```text
INDEX(userId)
INDEX(userId, status)
INDEX(lessonId)
```

---

# 17. Lesson Availability

Jangan menyimpan:

```text
lesson.locked = true
```

secara global.

Lesson lock bergantung pada user.

Status ditentukan secara dinamis:

```text
if previous lesson completed:
    AVAILABLE

else:
    LOCKED
```

Lesson pertama dari starting placement user dapat langsung tersedia.

---

# 18. Practice Session

```text
PracticeSession
------------------------
id
userId
lessonId?
practiceType
difficultyFeedback?
durationSeconds
startedAt
completedAt?
isValid
createdAt
```

Practice type:

```text
DAILY
CHORD
CHORD_TRANSITION
STRUMMING
LESSON
```

Difficulty feedback:

```text
EASY
OKAY
DIFFICULT
```

Indexes:

```text
INDEX(userId, completedAt)
INDEX(userId, practiceType)
INDEX(lessonId)
```

Practice hanya dihitung jika:

```text
completedAt != null
AND
durationSeconds >= minimumThreshold
AND
isValid = true
```

---

# 19. Practice Chord Relation

```text
PracticeSessionChord
------------------------
practiceSessionId
chordId
```

Composite unique:

```text
UNIQUE(practiceSessionId, chordId)
```

---

# 20. Chord

```text
Chord
------------------------
id
name
slug
type
difficulty
notes JSONB
diagramData JSONB
description
createdAt
updatedAt
```

Example:

```json
{
  "name": "C Major",
  "notes": ["C", "E", "G"],
  "strings": ["X", 3, 2, 0, 1, 0],
  "fingers": [0, 3, 2, 0, 1, 0]
}
```

Types:

```text
MAJOR
MINOR
SEVENTH
MAJOR_SEVENTH
MINOR_SEVENTH
SUSPENDED
```

---

# 21. Quiz

```text
Quiz
------------------------
id
lessonId
title
description
passingScore
xpReward
createdAt
updatedAt
```

Untuk MVP:

```text
one primary quiz per lesson
```

Maka:

```text
lessonId UNIQUE
```

---

# 22. Question

```text
Question
------------------------
id
quizId
type
prompt
explanation
order
```

Types:

```text
MULTIPLE_CHOICE
TRUE_FALSE
CHORD_IDENTIFICATION
```

Constraints:

```text
UNIQUE(quizId, order)
```

---

# 23. Answer Option

```text
AnswerOption
------------------------
id
questionId
text
isCorrect
order
```

Critical security rule:

`isCorrect` tidak pernah dikirim ke unauthenticated client atau client sebelum submission.

---

# 24. Quiz Attempt

```text
QuizAttempt
------------------------
id
userId
quizId
score
correctAnswers
totalQuestions
passed
startedAt
completedAt?
createdAt
```

Indexes:

```text
INDEX(userId, quizId)
INDEX(userId, completedAt)
```

User dapat retry quiz.

Karena itu tidak menggunakan:

```text
UNIQUE(userId, quizId)
```

---

# 25. Quiz Attempt Answer

```text
QuizAttemptAnswer
------------------------
id
quizAttemptId
questionId
selectedAnswerOptionId
isCorrect
createdAt
```

Unique:

```text
UNIQUE(quizAttemptId, questionId)
```

Scoring dilakukan server-side.

---

# 26. XP Transaction Ledger

XP wajib memakai ledger.

```text
XPTransaction
------------------------
id
userId
type
amount
referenceType
referenceId
idempotencyKey
createdAt
```

Types:

```text
LESSON_COMPLETED
QUIZ_COMPLETED
PERFECT_QUIZ
PRACTICE_COMPLETED
DAILY_GOAL
ACHIEVEMENT
ADMIN_ADJUSTMENT
```

Critical:

```text
idempotencyKey UNIQUE
```

Example:

```text
lesson-completed:{userId}:{lessonId}
```

Dengan demikian refresh tidak dapat menggandakan XP.

---

# 27. Achievement

```text
Achievement
------------------------
id
code
name
description
icon
conditionType
conditionValue
xpReward
active
```

Condition:

```text
LESSONS_COMPLETED
PRACTICE_SECONDS
CURRENT_STREAK
QUIZZES_COMPLETED
PERFECT_QUIZZES
```

---

# 28. User Achievement

```text
UserAchievement
------------------------
id
userId
achievementId
unlockedAt
```

Critical:

```text
UNIQUE(userId, achievementId)
```

---

# 29. Learning Activity

Gunakan activity log untuk analytics internal.

```text
LearningActivity
------------------------
id
userId
type
entityType
entityId
metadata JSONB
createdAt
```

Contoh:

```text
LESSON_STARTED
LESSON_COMPLETED
PRACTICE_COMPLETED
QUIZ_COMPLETED
ACHIEVEMENT_UNLOCKED
DAILY_GOAL_COMPLETED
```

Ini berguna untuk:

- dashboard history,
- analytics,
- debugging,
- audit.

---

# 30. Prisma Conceptual Schema

Struktur inti dapat diterjemahkan menjadi:

```text
User
 ├── Profile
 ├── OnboardingProfile
 ├── LessonProgress[]
 ├── PracticeSession[]
 ├── QuizAttempt[]
 ├── XPTransaction[]
 ├── UserAchievement[]
 └── LearningActivity[]

Course
 └── Module[]
      └── Lesson[]
           ├── LessonSection[]
           ├── LessonProgress[]
           └── Quiz

Quiz
 └── Question[]
      └── AnswerOption[]
```

Jangan generate production schema sebelum constraint di atas dipertahankan.

---

# 31. Authorization Matrix

| Resource | Guest | User | Admin |
|---|---:|---:|---:|
| Landing | Read | Read | Read |
| Course preview | Read | Read | Read |
| Register | Yes | N/A | N/A |
| Dashboard | No | Own | All |
| Profile | No | Own | All |
| Onboarding | No | Own | All |
| Lesson | Limited | Allowed | All |
| Lesson progress | No | Own | All |
| Practice | No | Own | All |
| Quiz | No | Own | All |
| Quiz answers | No | Own attempt | All |
| XP | No | Own | All |
| Achievement | Read | Own state | All |
| Curriculum editing | No | No | Yes |

Rule utama:

> Client tidak pernah menentukan ownership.

Server memperoleh:

```text
userId = authenticatedSession.user.id
```

---

# 32. Authorization Anti-Pattern

Jangan menerima:

```json
{
  "userId": "another-user-id",
  "lessonId": "lesson-01"
}
```

Untuk operasi user-owned.

Gunakan:

```text
session.user.id
```

User hanya mengirim resource target.

---

# 33. Core Use Cases

Application layer minimal harus memiliki:

```text
RegisterUser
CompleteOnboarding
GetDashboard
GetLearningPath
StartLesson
SaveLessonProgress
CompleteLesson
StartPractice
CompletePractice
StartQuiz
SubmitQuiz
GetProgressOverview
GetChordLibrary
CheckAchievements
```

---

# 34. Lesson Start Rule

Saat user membuka lesson:

```text
1. Authenticate user
2. Load lesson
3. Determine availability
4. Reject if locked
5. Find LessonProgress
6. If none:
       create IN_PROGRESS
7. Update lastAccessedAt
8. Return lesson content
```

---

# 35. Save Lesson Progress

Client mengirim:

```text
lessonId
currentSectionOrder
```

Server:

```text
authenticate
↓
validate ownership
↓
validate lesson exists
↓
validate section exists
↓
calculate percentage server-side
↓
persist
```

Client tidak boleh mengirim:

```text
progressPercentage = 100
```

dan dipercaya begitu saja.

---

# 36. Lesson Completion Rule

Lesson dianggap complete jika:

```text
required sections completed
AND
required practice completed
AND
quiz attempt completed
AND
quiz passing criteria satisfied
```

Jika quiz threshold:

```text
60%
```

maka score di bawah 60% tidak memenuhi completion.

---

# 37. Complete Lesson Transaction

Gunakan transaction.

```text
BEGIN

1. Authenticate
2. Lock/read LessonProgress
3. Check already COMPLETED
4. Validate lesson requirements
5. Mark LessonProgress COMPLETED
6. Award lesson XP
7. Update total XP
8. Update streak
9. Unlock progression logically
10. Check achievements
11. Write learning activity

COMMIT
```

Jika gagal:

```text
ROLLBACK
```

---

# 38. Idempotency

Endpoint/action berikut wajib idempotent:

```text
Complete Lesson
Complete Practice
Award XP
Unlock Achievement
Complete Daily Goal
```

Repeated request tidak boleh menghasilkan reward ulang.

---

# 39. Quiz Submission

Recommended flow:

```text
Start Quiz
↓
create QuizAttempt
↓
send questions without correct answer
↓
user answers
↓
submit
↓
server evaluates
↓
save QuizAttemptAnswer
↓
calculate score
↓
mark attempt completed
```

Client tidak pernah menghitung final authoritative score.

---

# 40. Quiz Score

Formula:

```text
score =
(correctAnswers / totalQuestions) × 100
```

Rounded to integer.

Example:

```text
4 / 5
= 80%
```

---

# 41. Practice Validation

Jangan membiarkan:

```text
Start Practice
→ immediately Complete
→ +XP
```

Gunakan minimum threshold.

Contoh:

```text
LESSON practice >= 60 sec
CHORD practice >= 120 sec
DAILY practice >= 300 sec
```

Nilai bisa disesuaikan setelah testing.

---

# 42. Streak Definition

Streak menggunakan **local calendar day** berdasarkan timezone user.

Valid learning day:

```text
lesson completed
OR
valid practice completed
OR
daily goal completed
```

Logic:

```text
if lastActiveDate == today:
    unchanged

if lastActiveDate == yesterday:
    currentStreak += 1

otherwise:
    currentStreak = 1
```

Kemudian:

```text
longestStreak =
max(longestStreak, currentStreak)
```

---

# 43. Daily Goal

Daily progress dihitung dari valid practice duration.

Example:

```text
Goal:
15 minutes

Today:
10 minute practice
+
5 minute lesson practice

Result:
15 / 15
```

Saat pertama kali melewati goal:

```text
DAILY_GOAL XP
```

hanya diberikan sekali per calendar day.

Idempotency:

```text
daily-goal:{userId}:{YYYY-MM-DD}
```

---

# 44. XP Rules

Initial values:

```text
Lesson Complete        +20 XP
Practice Complete      +10 XP
Quiz Complete          +10 XP
Perfect Quiz            +5 XP
Daily Goal             +10 XP
Achievement            variable
```

Jangan gunakan XP sebagai ukuran kemampuan gitar.

XP mengukur engagement/progression.

---

# 45. Level Formula

Untuk MVP gunakan sistem sederhana.

Example:

```text
Level 1 = 0 XP
Level 2 = 100 XP
Level 3 = 250 XP
Level 4 = 450 XP
Level 5 = 700 XP
```

Simpan:

```text
totalXP
```

Level dapat dihitung dari threshold.

Tidak perlu menyimpan level jika selalu derived.

Namun cache level pada Profile juga diperbolehkan jika konsisten.

---

# 46. Progress Formula

Lesson progress:

```text
completedRequiredSections
/
totalRequiredSections
× 100
```

Module progress:

```text
completedLessons
/
totalLessons
× 100
```

Course progress:

```text
completedCourseLessons
/
totalCourseLessons
× 100
```

Jangan menghitung berdasarkan waktu.

---

# 47. Dashboard Query

Dashboard membutuhkan data:

```text
User profile
Current streak
Total XP
Daily goal
Today's practice
Active lesson
Current course
Course progress
Latest activity
Recommended next action
```

Bangun satu application query:

```text
getDashboard(userId)
```

Hindari frontend melakukan 10 request terpisah.

---

# 48. Recommended Next Action

Rule MVP:

```text
IF active incomplete lesson exists
    → Continue Lesson

ELSE IF next lesson available
    → Start Next Lesson

ELSE IF daily goal incomplete
    → Start Practice

ELSE
    → Review Learning Path
```

---

# 49. API Structure

Recommended:

```text
/api/auth/*
/api/onboarding
/api/dashboard
/api/learning-path

/api/lessons/[lessonId]
/api/lessons/[lessonId]/start
/api/lessons/[lessonId]/progress
/api/lessons/[lessonId]/complete

/api/practice/start
/api/practice/[sessionId]/complete

/api/quizzes/[quizId]/start
/api/quizzes/attempts/[attemptId]/submit

/api/progress
/api/chords
/api/chords/[slug]
```

Jika Server Actions digunakan, business rule tetap harus berada di service/use-case layer.

---

# 50. API Response Contract

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "LESSON_LOCKED",
    "message": "This lesson is currently locked."
  }
}
```

Jangan expose stack trace.

---

# 51. Error Codes

Minimum:

```text
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR

USER_NOT_FOUND
LESSON_NOT_FOUND
LESSON_LOCKED
LESSON_ALREADY_COMPLETED
LESSON_REQUIREMENT_INCOMPLETE

PRACTICE_SESSION_NOT_FOUND
PRACTICE_TOO_SHORT
PRACTICE_ALREADY_COMPLETED

QUIZ_NOT_FOUND
QUIZ_ATTEMPT_NOT_FOUND
QUIZ_ALREADY_SUBMITTED

XP_TRANSACTION_DUPLICATE

INTERNAL_SERVER_ERROR
```

---

# 52. Validation Strategy

Semua external input divalidasi server-side.

Contoh:

```text
dailyGoalMinutes
10 | 15 | 30 | 45 | 60
```

Progress input:

```text
sectionOrder:
integer
>= 1
```

String:

```text
trim
max length
```

Enum:

```text
strict whitelist
```

---

# 53. Database Index Strategy

Indexes prioritas:

```text
User.email

Lesson.moduleId
Lesson.moduleId + order

LessonProgress.userId
LessonProgress.userId + status
LessonProgress.userId + lessonId

PracticeSession.userId + completedAt

QuizAttempt.userId + quizId

XPTransaction.userId + createdAt
XPTransaction.idempotencyKey

LearningActivity.userId + createdAt
```

Jangan membuat index untuk setiap column.

---

# 54. Referential Integrity

Use foreign key.

Delete behavior:

```text
User deletion
→ Cascade user-owned records

Course deletion
→ Restrict if published

Module deletion
→ Cascade child lessons during admin operation

Lesson deletion
→ Prefer soft deletion/unpublish
```

Untuk production content, lebih baik:

```text
published = false
```

daripada hard delete.

---

# 55. Seed Strategy

Database harus memiliki deterministic seed.

Seed MVP:

```text
1 Course

6 Modules

25–30 Lessons

10–15 Chords

5 Achievements

Quiz questions per lesson
```

---

# 56. Initial Course Seed

## Module 1

```text
Guitar Fundamentals

1. Introduction to Guitar
2. Guitar Anatomy
3. Holding the Guitar
4. Understanding Strings
5. Guitar Tuning
```

## Module 2

```text
Basic Chords

6. C Major
7. G Major
8. D Major
9. A Minor
10. E Minor
```

## Module 3

```text
Chord Transition

11. C → G
12. G → D
13. C → Am
14. Am → Em
15. Four Chord Progression
```

## Module 4

```text
Rhythm & Strumming

16. Rhythm Basics
17. Downstroke
18. Upstroke
19. Basic Pattern
20. Chord + Rhythm
```

## Module 5

```text
Music Theory

21. Musical Notes
22. Major Chords
23. Minor Chords
24. Progressions
25. Tempo
```

## Module 6

```text
First Song

26. Song Structure
27. Chord Preparation
28. Rhythm Preparation
29. Slow Practice
30. Full Playthrough
```

---

# 57. Achievement Seed

```text
FIRST_STEP
Complete 1 lesson

FIRST_CHORD
Complete first chord lesson

DEDICATED_LEARNER
Complete 10 lessons

CONSISTENT_LEARNER
Reach 7-day streak

PRACTICE_STARTER
Complete 3600 seconds practice
```

---

# 58. Testing Pyramid

Gunakan:

```text
Unit Tests
↑ paling banyak

Integration Tests

End-to-End Tests
↓ paling sedikit tetapi critical
```

---

# 59. Unit Tests

Wajib untuk:

```text
calculateQuizScore
calculateProgress
calculateStreak
determineLessonAvailability
calculateLevel
achievementConditions
dailyGoalCalculation
```

---

# 60. Integration Tests

Wajib:

```text
lesson completion
XP transaction
quiz submission
practice completion
achievement unlocking
onboarding completion
```

---

# 61. E2E Critical Path

Playwright harus menguji:

```text
Register
↓
Onboarding
↓
Dashboard
↓
Start Lesson
↓
Progress
↓
Practice
↓
Quiz
↓
Complete Lesson
↓
XP awarded
↓
Next lesson available
↓
Logout
↓
Login
↓
Progress persisted
```

Ini merupakan **Golden Path Test**.

---

# 62. Security Tests

Minimum:

```text
User A cannot access User B progress

User cannot submit fake XP

User cannot mark locked lesson completed

User cannot manipulate quiz score

User cannot complete another user's practice session

Repeated completion does not duplicate rewards
```

---

# 63. Observability

Production harus memiliki:

```text
Error monitoring
Structured logs
Request correlation ID
Basic analytics
```

Log event penting:

```text
LESSON_COMPLETION_FAILED
QUIZ_SUBMISSION_FAILED
XP_DUPLICATE_PREVENTED
AUTHORIZATION_DENIED
```

Jangan log:

```text
password
session token
sensitive auth data
```

---

# 64. Environment Strategy

Minimal:

```text
local
preview
production
```

Database jangan dibagikan antara:

```text
development
production
```

Environment variables:

```text
DATABASE_URL
AUTH_SECRET
AUTH_URL
STORAGE credentials
SENTRY credentials
ANALYTICS credentials
```

Tidak ada secret di repository.

---

# 65. Migration Policy

Setiap schema change harus menggunakan migration.

Jangan menjalankan direct manual table edits pada production.

Flow:

```text
Modify Prisma Schema
↓
Generate Migration
↓
Review SQL
↓
Test locally
↓
Apply preview
↓
Verify
↓
Production migration
```

---

# 66. CI Pipeline

Minimal:

```text
Install dependencies
↓
Lint
↓
Typecheck
↓
Unit tests
↓
Integration tests
↓
Build
```

Pull request tidak boleh merge jika critical checks gagal.

---

# 67. Definition of Done untuk Backend Feature

Feature dianggap selesai hanya jika:

```text
Database migration exists
Validation exists
Authorization exists
Business rule tested
Repository implemented
Use case implemented
Error handling implemented
Integration test passes
No duplicate reward vulnerability
Documentation updated
```

---

# 68. Phase 0 Release Gate

Phase 0 selesai jika:

### Architecture

```text
✓ Modular boundaries defined
✓ Application flow defined
✓ Repository responsibilities defined
```

### Database

```text
✓ Entities finalized
✓ FK defined
✓ Unique constraints defined
✓ Index strategy defined
✓ enums defined
```

### Business Rules

```text
✓ lesson completion defined
✓ quiz scoring defined
✓ practice validity defined
✓ XP defined
✓ streak defined
✓ achievements defined
```

### Security

```text
✓ authorization matrix defined
✓ ownership rules defined
✓ input validation defined
✓ anti-double-reward strategy defined
```

### Delivery

```text
✓ seed strategy defined
✓ migration strategy defined
✓ test strategy defined
✓ CI requirements defined
```

---

# 69. Architecture Summary

Final MVP architecture:

```text
Next.js Web Application
       │
       ▼
Authentication Layer
       │
       ▼
Application Use Cases
       │
       ├── Learning
       ├── Practice
       ├── Quiz
       ├── Progress
       └── Gamification
       │
       ▼
Domain Services
       │
       ▼
Repositories
       │
       ▼
Prisma ORM
       │
       ▼
PostgreSQL
```

---

# 70. Engineering Principle

Untuk seluruh implementation:

> **The server is authoritative.**

Browser boleh meminta sesuatu dilakukan.

Browser tidak boleh menentukan apakah sesuatu benar.

Karena itu server menentukan:

```text
lesson availability
progress percentage
quiz score
XP
streak
achievement
course completion
```

---

# 71. Status Setelah Phase 0

Project sekarang memiliki:

```text
Product Concept
✓

PRD
✓

Persona
✓

Sitemap
✓

User Flow
✓

MVP Scope
✓

Technical Architecture
✓

Database Model
✓

Business Rules
✓

Authorization Model
✓

Transaction Strategy
✓

Seed Strategy
✓

Testing Strategy
✓
```

Fondasi engineering sudah cukup jelas untuk memasuki tahap product interface dan implementation planning.

---

# 72. Phase Berikutnya

Tahap berikutnya:

## PHASE 1
## UX Architecture + Wireframe System + Design System

Urutan:

```text
01 Information Architecture refinement

02 Screen Inventory

03 Dashboard Wireframe

04 Onboarding Wireframe

05 Learning Path Wireframe

06 Lesson Experience Wireframe

07 Practice Experience Wireframe

08 Quiz Wireframe

09 Progress Dashboard Wireframe

10 Chord Library Wireframe

11 Responsive Behavior

12 Component Inventory

13 Design Tokens

14 Typography System

15 Color System

16 Spacing & Layout System

17 Interaction States

18 Loading / Empty / Error States

19 Accessibility

20 Final UI Specification
```

Setelah itu:

```text
PHASE 2
Database + Prisma Implementation

PHASE 3
Authentication + Onboarding

PHASE 4
Learning Engine

PHASE 5
Practice + Quiz

PHASE 6
Progress + Gamification

PHASE 7
QA + Production
```