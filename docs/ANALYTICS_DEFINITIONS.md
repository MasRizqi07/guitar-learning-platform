# Platform Analytics Definitions & Methodology
## Guitar Learning Platform — Phase E Production Analytics

This document defines the formal semantics, authoritative database sources, computation formulas, time boundaries, and exclusion rules for all KPIs and analytics presented within the **Owner Console**.

---

### Core Data Integrity Principles

1. **Authoritative Transactional Truth**: All learning progress, engagement metrics, practice time, and retention figures are derived exclusively from immutable or authoritative PostgreSQL records (`User`, `LessonProgress`, `PracticeSession`, `QuizAttempt`, `LearningActivity`, `OnboardingProfile`).
2. **Behavioral Analytics Non-Authoritative**: Client-side event streams (e.g. PostHog) capture UI behavioral events only. They **never** determine curriculum unlocking, XP, quiz evaluation, streak calculation, or authorization.
3. **Staff Account Exclusion**: Operational and administrative staff (`CONTENT_EDITOR`, `SUPPORT`, `ADMIN`, `OWNER`) are excluded from learner KPIs by default to prevent internal development, testing, and content editing activities from polluting product performance metrics.
4. **Internal Testing Exclusion**: Any learner marked with `analyticsExcluded: true` (e.g. automated E2E synthetic testing bots, QA accounts, demo users) is strictly excluded from all aggregations.
5. **Timezone Uniformity**: All calculations use strict **UTC** boundaries ($[00:00:00\text{ UTC}, 23:59:59.999\text{ UTC}]$).
6. **Graceful Zero-State Handling**: Denominators equal to zero evaluate to `0` or `0.0%` (never `NaN`, `Infinity`, or uncaught division errors).

---

### Metric Directory

| Metric | Source Entity | Time Window | Exclusions |
| :--- | :--- | :--- | :--- |
| **Total Learners** | `User` | All-time | Staff roles, `analyticsExcluded=true`, `DELETED` status |
| **Verified Learners** | `User` | All-time | Staff roles, `analyticsExcluded=true`, unverified email |
| **New Learners** | `User` | Selected period | Staff roles, `analyticsExcluded=true` |
| **Active Learners** | `LessonProgress`, `PracticeSession`, `QuizAttempt` | Selected period | Staff roles, `analyticsExcluded=true`, invalid sessions |
| **DAU** | Distinct active learners | 1 day (trailing 24h) | Staff roles, `analyticsExcluded=true` |
| **WAU** | Distinct active learners | Trailing 7 days | Staff roles, `analyticsExcluded=true` |
| **MAU** | Distinct active learners | Trailing 30 days | Staff roles, `analyticsExcluded=true` |
| **Stickiness (DAU/MAU)** | Formula: $\frac{\text{DAU}}{\text{MAU}}$ | Current day / Trailing 30d | Staff roles, `analyticsExcluded=true` |
| **Activation Rate** | `User` $\to$ `OnboardingProfile` $\to$ `LessonProgress` | Cohort period | Staff roles, `analyticsExcluded=true` |
| **Valid Practice Minutes** | `PracticeSession` (`isValid=true`) | Selected period | Staff roles, `analyticsExcluded=true`, invalid sessions |
| **Quiz Pass Rate** | `QuizAttempt` (`completedAt != null`) | Selected period | Staff roles, `analyticsExcluded=true`, unfinished attempts |
| **Cohort Retention (D1, D7, D30)** | `User.createdAt` $\times$ Active Days | Cohort date | Staff roles, `analyticsExcluded=true`, immature cohorts |

---

### Detailed Metric Formulas & Specifications

#### 1. Total Learners
* **Business Definition**: Total cumulative volume of actual learner accounts registered on the platform.
* **Filter Criteria**:
  $$\text{role} = \text{'LEARNER'} \land \text{analyticsExcluded} = \text{false} \land \text{status} \ne \text{'DELETED'}$$
* **Authoritative Source**: `User` table.
* **Limitations**: Does not indicate active participation, only registered accounts.

#### 2. Verified Learners
* **Business Definition**: Learner accounts with confirmed email ownership.
* **Numerator**: Distinct learners satisfying criteria with `emailVerified IS NOT NULL`.
* **Denominator**: Total Learners.
* **Formula**: $\frac{\text{Verified Learners}}{\text{Total Learners}} \times 100\%$
* **Authoritative Source**: `User.emailVerified`.

#### 3. Meaningful Active Learner (Engagement)
* **Business Definition**: A learner who executed at least one qualifying educational activity within the measurement window. Merely loading a page or establishing an HTTP session does **not** qualify.
* **Qualifying Activities**:
  1. `LessonProgress`: Interaction where `updatedAt` falls within the window and status is `IN_PROGRESS` or `COMPLETED`.
  2. `PracticeSession`: Completed session with `isValid = true` and `completedAt` in window.
  3. `QuizAttempt`: Completed attempt with `completedAt` in window.
* **Authoritative Sources**: `LessonProgress`, `PracticeSession`, `QuizAttempt`.
* **Deduplication**: Aggregated by distinct `userId`.

#### 4. DAU / WAU / MAU & Stickiness
* **Daily Active Users (DAU)**: Count of distinct meaningful active learners in the selected 1-day window.
* **Weekly Active Users (WAU)**: Count of distinct meaningful active learners in the trailing 7 days relative to window end.
* **Monthly Active Users (MAU)**: Count of distinct meaningful active learners in the trailing 30 days relative to window end.
* **Stickiness Ratio**:
  $$\text{Stickiness} = \frac{\text{DAU}}{\text{MAU}}$$
  *Represented as a percentage, indicating how frequently monthly learners engage on any given day.*

#### 5. Official Activation Milestone & Funnel
* **Official Milestone Definition**: A learner who has **completed onboarding** AND **started their first lesson** (`LessonProgress.startedAt IS NOT NULL`).
* **Funnel Stages** (Measured on eligible cohort registered within period):
  1. **Registered**: $N_1 = \text{Learners created in window}$
  2. **Email Verified**: $N_2 = N_1 \text{ with } \text{emailVerified} \ne \text{null}$
  3. **Onboarding Completed**: $N_3 = N_2 \text{ with } \text{OnboardingProfile.completed} = \text{true}$
  4. **First Lesson Started**: $N_4 = N_3 \text{ with at least 1 } \text{LessonProgress.startedAt} \ne \text{null}$
  5. **First Lesson Completed**: $N_5 = N_4 \text{ with at least 1 } \text{LessonProgress.status} = \text{'COMPLETED'}$
  6. **Returned (Day 2+)**: $N_6 = N_5 \text{ with active session } \ge 24\text{ hours after registration}$
* **Conversion Rates**: Computed both Step-to-Step ($\frac{N_{i+1}}{N_i}$) and Overall ($\frac{N_i}{N_1}$).

#### 6. Retention Cohort Analysis (D1, D7, D30)
* **Cohort Definition**: Group of eligible learners registered on calendar Day 0 ($\text{UTC}$).
* **Day $N$ Activity Definition**: The learner performed at least one meaningful educational activity on calendar Day $N$ relative to Day 0 (i.e. between $N \times 86400$ and $(N + 1) \times 86400$ seconds from cohort start).
* **Maturity Guard Invariant**:
  - A cohort is eligible for **Day 1** retention only if $\text{Cohort Age} \ge 1\text{ day}$.
  - A cohort is eligible for **Day 7** retention only if $\text{Cohort Age} \ge 7\text{ days}$.
  - A cohort is eligible for **Day 30** retention only if $\text{Cohort Age} \ge 30\text{ days}$.
  *Immature cohorts are excluded from denominators to eliminate artificially suppressed retention figures.*

#### 7. Practice Analytics
* **Practice Minutes**:
  $$\text{Minutes} = \frac{\sum \text{durationSeconds}}{60} \quad \forall \text{ PracticeSession } \mid \text{isValid} = \text{true}$$
  *Anti-cheat rejected sessions (`isValid = false`) and sessions shorter than minimum duration are strictly excluded.*
* **Practice Distribution**: Grouped by `PracticeType` (`DAILY`, `CHORD`, `CHORD_TRANSITION`, `STRUMMING`, `LESSON`).
* **Difficulty Feedback**: Distribution of learner self-assessments (`EASY`, `OKAY`, `DIFFICULT`) submitted post-practice.

#### 8. Quiz Analytics
* **Total Completed Attempts**: Count of `QuizAttempt` where `completedAt IS NOT NULL`. (Unfinished/in-progress attempts are excluded).
* **Pass Rate**:
  $$\text{Pass Rate} = \frac{\text{Count}(\text{passed} = \text{true})}{\text{Total Completed Attempts}} \times 100\%$$
* **Average Score**: Mean percentage score across all completed attempts.

#### 9. Content Performance & Stalled Learners
* **Lesson Starts**: Distinct learners with `LessonProgress.startedAt IS NOT NULL` for that lesson.
* **Lesson Completions**: Distinct learners with `LessonProgress.status = 'COMPLETED'` for that lesson.
* **Lesson Completion Rate**: $\frac{\text{Unique Completions}}{\text{Unique Starts}} \times 100\%$.
* **Stalled Learner**: A learner who started a lesson ($\text{startedAt} \ne \text{null}$), has **not** completed it ($\text{status} \ne \text{'COMPLETED'}$), and whose last interaction was over 7 days ago:
  $$\text{now} - \text{lastAccessedAt} > 7\text{ days}$$
  *Classified as "stalled" rather than "churned" because access to the lesson remains open indefinitely.*
