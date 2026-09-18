# PRODUCT REQUIREMENTS DOCUMENT

## Guitar Learning Platform for Beginners

**Document Type:** Product Requirements Document  
**Product Category:** Music Education / EdTech  
**Primary Platform:** Web Application  
**Target User:** Beginner Guitar Learners  
**Product Stage:** MVP  
**Version:** 1.0

---

# 1. Product Overview

## 1.1 Product Summary

Guitar Learning Platform adalah aplikasi web pembelajaran gitar yang dirancang untuk membantu pemula belajar gitar secara terstruktur.

Platform menyediakan learning path, lesson interaktif, materi chord, latihan, quiz, progress tracking, dan gamification.

Produk tidak berfokus pada streaming musik. Produk berfokus pada proses belajar.

Core learning cycle:

```text
Learn
↓
Practice
↓
Evaluate
↓
Track Progress
↓
Continue
```

Platform bertujuan mengurangi ketergantungan pengguna pada materi pembelajaran yang tersebar dan tidak terstruktur.

---

# 2. Product Vision

Membangun platform pembelajaran gitar yang memberikan jalur belajar yang jelas, progresif, mudah dipahami, dan dapat diukur bagi pemula.

Platform harus membantu pengguna mengetahui:

- apa yang harus dipelajari,
- bagaimana cara mempraktikkannya,
- apakah mereka sudah memahami materi,
- sejauh mana perkembangan mereka,
- dan apa yang harus dilakukan selanjutnya.

---

# 3. Problem Statement

Banyak pemula ingin belajar gitar tetapi kesulitan membangun proses belajar yang konsisten.

Masalah utama antara lain:

1. Materi pembelajaran tersebar di banyak platform.
2. Pengguna tidak mengetahui urutan belajar yang benar.
3. Banyak tutorial hanya mengajarkan lagu tanpa fondasi teknik.
4. Pemula sulit mengukur perkembangan.
5. Tidak ada feedback sederhana setelah belajar.
6. Pengguna sering berhenti karena kehilangan motivasi.
7. Progress belajar tidak terdokumentasi.
8. Pengguna kesulitan menentukan latihan harian.

Platform ini harus mengubah proses belajar yang tidak terstruktur menjadi learning journey yang sistematis.

---

# 4. Product Goals

## 4.1 Primary Goals

Produk memiliki lima tujuan utama.

### Goal 1: Structured Learning

Memberikan learning path yang jelas dari level dasar.

Contoh:

```text
Guitar Fundamentals
↓
Basic Chords
↓
Chord Transition
↓
Strumming
↓
Basic Music Theory
↓
First Song
```

### Goal 2: Learning Consistency

Mendorong pengguna belajar secara rutin melalui:

- daily goal,
- streak,
- XP,
- lesson progression,
- practice tracking.

### Goal 3: Practical Learning

Setiap konsep harus memiliki aktivitas praktik.

Pengguna tidak hanya membaca teori.

### Goal 4: Measurable Progress

Pengguna dapat melihat perkembangan berdasarkan:

- lesson completion,
- course progress,
- practice duration,
- quiz result,
- learning streak,
- XP,
- achievement.

### Goal 5: Beginner-Friendly Experience

Pengguna yang belum pernah memainkan gitar harus tetap memahami cara menggunakan platform tanpa membutuhkan pengetahuan musik sebelumnya.

---

# 5. Non-Goals & Feature Inclusions

### Implemented Learning Utilities (Delivered in Core MVP):
- **Interactive Guitar Tuner (`/tuner`):** Web Audio API autocorrelation microphone pitch detection, cent deviation meter, and 6 standard acoustic reference tones with continuous loop mode.
- **Interactive Fretboard Explorer (`/library`):** 15-fret interactive neck with scale filters (C Major, A Minor Pentatonic, E Minor Pentatonic, A Blues) and click-to-pluck real-time audio synthesis.

### Explicitly Excluded Non-Goals (Preserved Feature Freeze):
Untuk menjaga stabilitas sistem dan integritas core learning path, fitur-fitur berikut tidak termasuk dalam scope:
- live tutoring & video call dengan instructor,
- marketplace guru musik,
- automatic chord polyphonic AI recognition (microphone listening for full chords),
- leaderboard global & social community feeds,
- multiplayer practice,
- user-generated content / marketplace courses,
- full song commercial audio streaming,
- music licensing platform,
- advanced guitar tablature interactive editor.

Fitur tersebut tidak akan ditambahkan untuk menjaga reliabilitas dan performa platform.

---

# 6. Target Users

## Primary Target

Pengguna pemula yang ingin belajar gitar dari awal.

Rentang umum:

```text
Age: 15–30
Experience: Beginner
Device: Laptop / Smartphone
Learning Style: Self-paced
```

Platform tidak harus membatasi umur secara teknis.

---

# 7. User Persona

## Persona 1: Absolute Beginner

**Name:** Adi  
**Age:** 18  
**Occupation:** Student  
**Experience:** Tidak pernah bermain gitar  
**Instrument:** Acoustic Guitar

### Goals

- Bisa memainkan chord dasar.
- Bisa memainkan lagu sederhana.
- Mengetahui urutan belajar.
- Berlatih minimal 15 menit sehari.

### Pain Points

- Bingung harus mulai dari mana.
- Tutorial YouTube terlalu banyak.
- Tidak memahami istilah musik.
- Mudah kehilangan motivasi.

### Needs

- Step-by-step lesson.
- Simple explanation.
- Visual chord diagrams.
- Progress tracking.

---

## Persona 2: Casual Beginner

**Name:** Rina  
**Age:** 21  
**Occupation:** University Student  
**Experience:** Mengetahui beberapa chord.

### Goals

- Memperbaiki chord transition.
- Belajar strumming pattern.
- Bisa memainkan beberapa lagu.

### Pain Points

- Chord sering buzzing.
- Transisi chord lambat.
- Tidak memiliki latihan terstruktur.

### Needs

- Guided practice.
- Practice timer.
- Chord transition exercises.
- Learning progress.

---

## Persona 3: Returning Learner

**Name:** Fajar  
**Age:** 24  
**Occupation:** Junior Employee  
**Experience:** Pernah belajar tetapi berhenti.

### Goals

- Mulai belajar kembali.
- Mengetahui skill yang sudah dikuasai.
- Belajar secara konsisten.

### Pain Points

- Tidak tahu harus mulai kembali dari mana.
- Waktu belajar terbatas.

### Needs

- Placement assessment.
- Short daily sessions.
- Learning recommendation.

---

# 8. Core Product Principles

Platform harus mengikuti prinsip berikut.

## 8.1 Clear Next Action

Setiap halaman harus memberikan tindakan utama yang jelas.

Contoh:

```text
Dashboard
→ Continue Learning

Lesson
→ Continue

Completion
→ Next Lesson
```

## 8.2 Learning Before Gamification

Gamification tidak boleh mengganggu tujuan pendidikan.

XP dan achievement hanya berfungsi sebagai reinforcement.

## 8.3 Progressive Complexity

Materi harus berkembang dari sederhana menuju kompleks.

## 8.4 Immediate Feedback

Pengguna harus segera mengetahui hasil quiz atau progress lesson.

## 8.5 Low Cognitive Load

Interface tidak boleh terlalu penuh.

Pemula harus fokus pada satu aktivitas utama.

---

# 9. Core Learning Loop

Core product loop:

```text
User Login
↓
Dashboard
↓
Continue Learning
↓
Lesson
↓
Practice
↓
Quiz
↓
Lesson Completed
↓
XP + Progress
↓
Next Lesson
```

Loop tersebut harus menjadi bagian paling stabil dalam MVP.

---

# 10. MVP Scope

MVP memiliki sembilan functional areas.

```text
1. Authentication
2. Onboarding
3. Dashboard
4. Learning Path
5. Lesson System
6. Practice
7. Quiz
8. Progress Tracking
9. Gamification
```

---

# 11. MVP Feature Requirements

# 11.1 Authentication

## Description

Pengguna dapat membuat akun dan masuk ke platform.

### Features

- Register
- Login
- Logout
- Forgot Password
- Reset Password
- Session persistence

### User Story

**US-AUTH-01**

Sebagai pengguna baru, saya ingin membuat akun agar progress belajar saya dapat disimpan.

### Acceptance Criteria

```text
GIVEN pengguna berada pada halaman register
WHEN pengguna memasukkan nama, email, dan password yang valid
THEN sistem membuat akun pengguna
AND pengguna diarahkan ke onboarding.
```

```text
GIVEN email sudah digunakan
WHEN pengguna mencoba register
THEN sistem menolak registrasi
AND menampilkan pesan bahwa email sudah terdaftar.
```

---

# 11.2 Onboarding

## Description

Sistem mengumpulkan data awal untuk menentukan pengalaman belajar.

### Data

- learning goal,
- guitar experience,
- guitar type,
- daily practice target,
- skill level.

---

## User Story

**US-ONB-01**

Sebagai pengguna baru, saya ingin menentukan tujuan belajar agar platform memahami kebutuhan saya.

### Acceptance Criteria

```text
GIVEN pengguna berada pada onboarding goal
WHEN pengguna memilih minimal satu learning goal
THEN pengguna dapat melanjutkan ke langkah berikutnya.
```

---

## User Story

**US-ONB-02**

Sebagai pengguna, saya ingin memilih level pengalaman agar materi awal sesuai kemampuan saya.

### Acceptance Criteria

Pilihan minimal:

```text
Never Played
Know Some Chords
Can Play Basic Songs
Intermediate
```

Sistem harus menyimpan level yang dipilih.

---

## User Story

**US-ONB-03**

Sebagai pengguna, saya ingin memilih target waktu latihan harian.

### Acceptance Criteria

Pilihan:

```text
10 minutes
15 minutes
30 minutes
45 minutes
60 minutes
```

Daily goal harus tampil pada dashboard.

---

# 11.3 Skill Assessment

## Description

Assessment membantu menentukan starting point.

### Requirement

Pengguna yang memilih:

```text
Never Played
```

dapat melewati assessment.

Pengguna berpengalaman dapat menjawab assessment.

### User Story

**US-ASS-01**

Sebagai pengguna yang sudah memiliki pengalaman, saya ingin melakukan skill assessment agar saya tidak harus memulai dari materi yang terlalu dasar.

### Acceptance Criteria

```text
GIVEN pengguna menyelesaikan assessment
WHEN sistem menghitung score
THEN sistem menentukan recommended starting level
AND menampilkan placement result.
```

---

# 11.4 Dashboard

## Purpose

Dashboard menjadi command center pengguna.

Dashboard harus menjawab:

```text
What should I learn next?
How am I progressing?
How much should I practice today?
```

### Required Components

- greeting,
- daily goal,
- continue learning,
- current course,
- course progress,
- streak,
- XP,
- completed lesson count,
- recommended practice.

---

## User Story

**US-DASH-01**

Sebagai pengguna, saya ingin melihat lesson terakhir agar saya dapat melanjutkan belajar tanpa mencarinya kembali.

### Acceptance Criteria

```text
GIVEN pengguna memiliki lesson aktif
WHEN pengguna membuka dashboard
THEN dashboard menampilkan Continue Learning
AND menunjukkan nama course
AND nama lesson
AND tombol Continue.
```

---

## User Story

**US-DASH-02**

Sebagai pengguna, saya ingin melihat daily goal.

### Acceptance Criteria

Dashboard menampilkan:

```text
Practice Completed / Daily Goal
```

Contoh:

```text
8 / 15 minutes
```

---

# 11.5 Learning Path

## Description

Learning Path menunjukkan urutan pembelajaran.

### Initial Curriculum

```text
MODULE 01
Guitar Fundamentals

MODULE 02
Basic Chords

MODULE 03
Chord Transition

MODULE 04
Rhythm & Strumming

MODULE 05
Basic Music Theory

MODULE 06
Play Your First Song
```

---

## Lesson State

Lesson harus memiliki state:

```text
LOCKED
AVAILABLE
IN_PROGRESS
COMPLETED
```

---

## User Story

**US-LRN-01**

Sebagai pengguna, saya ingin melihat seluruh learning path agar saya mengetahui perjalanan belajar saya.

### Acceptance Criteria

Learning Path harus menampilkan:

- module title,
- lesson title,
- lesson status,
- module progress,
- current lesson.

---

## User Story

**US-LRN-02**

Sebagai pengguna, saya ingin lesson berikutnya terbuka setelah lesson sebelumnya selesai.

### Acceptance Criteria

```text
GIVEN Lesson 01 completed
WHEN sistem memproses completion
THEN Lesson 02 berubah dari LOCKED menjadi AVAILABLE.
```

---

# 11.6 Lesson

## Description

Lesson adalah unit utama pembelajaran.

Setiap lesson dapat memiliki:

```text
Lesson Overview
Theory
Visual Explanation
Chord Diagram
Technique Instructions
Common Mistakes
Practice
Quiz
Summary
```

---

## Lesson Metadata

Setiap lesson memiliki:

```text
Title
Description
Difficulty
Estimated Duration
Learning Objectives
XP Reward
Module
Order
```

---

## User Story

**US-LES-01**

Sebagai pengguna, saya ingin melihat objective lesson sebelum belajar.

### Acceptance Criteria

Lesson overview harus menampilkan minimal:

- lesson title,
- duration,
- difficulty,
- learning objectives,
- XP reward.

---

## User Story

**US-LES-02**

Sebagai pengguna, saya ingin dapat berpindah antar bagian lesson secara progresif.

### Acceptance Criteria

Lesson harus memiliki progress indicator.

Contoh:

```text
Step 2 of 5
40%
```

---

## User Story

**US-LES-03**

Sebagai pengguna, saya ingin melanjutkan lesson yang belum selesai.

### Acceptance Criteria

```text
GIVEN pengguna meninggalkan lesson pada Step 3
WHEN pengguna kembali
THEN sistem menawarkan resume dari Step 3.
```

---

# 11.7 Chord Library

## Description

Library menyediakan referensi chord dasar.

### Initial Chords

```text
C
D
E
F
G
A
B

Am
Dm
Em
```

MVP tidak perlu seluruh chord gitar.

---

## Chord Data

Setiap chord memiliki:

```text
Name
Type
Difficulty
Notes
Finger Position
String Position
Diagram
Description
```

---

## User Story

**US-CHD-01**

Sebagai pengguna, saya ingin melihat chord diagram agar saya memahami posisi jari.

### Acceptance Criteria

Chord page menampilkan:

- chord name,
- diagram,
- finger placement,
- notes,
- difficulty.

---

# 11.8 Practice Mode

## Purpose

Membantu pengguna mempraktikkan skill secara terstruktur.

### MVP Practice Modes

```text
Daily Practice
Chord Practice
Chord Transition Practice
```

Metronome dapat dimasukkan jika implementasi cukup sederhana.

---

## Practice Session Data

```text
Practice Type
Duration
Started At
Completed At
Related Chords
Related Lesson
```

---

## User Story

**US-PRC-01**

Sebagai pengguna, saya ingin memulai practice session agar waktu latihan saya tercatat.

### Acceptance Criteria

```text
GIVEN pengguna memilih practice
WHEN pengguna menekan Start
THEN timer dimulai.
```

Ketika selesai:

```text
THEN practice session disimpan
AND practice duration diperbarui
AND daily goal diperbarui.
```

---

## User Story

**US-PRC-02**

Sebagai pengguna, saya ingin menilai tingkat kesulitan latihan.

### Acceptance Criteria

Setelah latihan, pengguna dapat memilih:

```text
Easy
Okay
Difficult
```

Response harus tersimpan.

---

# 11.9 Quiz

## Description

Quiz digunakan untuk knowledge check.

Quiz MVP tidak dimaksudkan untuk menguji kemampuan bermain secara audio.

### Question Types

MVP cukup menggunakan:

```text
Multiple Choice
True / False
Chord Identification
```

---

## User Story

**US-QUIZ-01**

Sebagai pengguna, saya ingin mengetahui apakah jawaban saya benar.

### Acceptance Criteria

Setelah jawaban:

```text
Correct
```

atau:

```text
Incorrect
```

harus langsung ditampilkan.

Jika salah, sistem menampilkan explanation singkat.

---

## User Story

**US-QUIZ-02**

Sebagai pengguna, saya ingin melihat score setelah quiz selesai.

### Acceptance Criteria

Quiz result harus menampilkan:

```text
Score
Correct Answers
Incorrect Answers
XP Earned
```

---

# 11.10 Lesson Completion

## Description

Lesson selesai ketika semua required activity terpenuhi.

### Completion Requirements

Minimal:

```text
All mandatory content viewed
Practice completed
Quiz completed
```

Threshold quiz dapat dibuat fleksibel.

Contoh MVP:

```text
Minimum Quiz Score = 60%
```

---

## User Story

**US-COMP-01**

Sebagai pengguna, saya ingin mendapatkan feedback ketika lesson selesai.

### Acceptance Criteria

Completion page menampilkan:

```text
Lesson Completed
XP Earned
Quiz Score
Practice Duration
Current Streak
```

CTA:

```text
Continue to Next Lesson
Back to Dashboard
```

---

# 11.11 Progress Tracking

## Description

Progress page memberikan gambaran perkembangan belajar.

### Metrics

```text
Overall Course Progress
Module Progress
Lessons Completed
Total Practice Time
Current Streak
Longest Streak
XP
Quiz Average
```

---

## User Story

**US-PROG-01**

Sebagai pengguna, saya ingin melihat progress course saya.

### Acceptance Criteria

Progress page menampilkan persentase.

Contoh:

```text
Guitar Fundamentals
100%

Basic Chords
65%

Chord Transition
20%
```

---

## User Story

**US-PROG-02**

Sebagai pengguna, saya ingin melihat histori belajar.

### Acceptance Criteria

Sistem menyimpan minimal:

```text
lesson completed date
practice session
quiz attempt
XP earned
```

---

# 11.12 XP System

## Description

XP digunakan untuk memberikan feedback perkembangan.

Contoh scoring awal:

```text
Complete Lesson      +20 XP
Complete Practice    +10 XP
Complete Quiz        +10 XP
Perfect Quiz         +5 XP
Daily Goal           +10 XP
```

Nilai dapat berubah berdasarkan testing.

---

## User Story

**US-XP-01**

Sebagai pengguna, saya ingin mendapatkan XP setelah aktivitas belajar.

### Acceptance Criteria

XP hanya diberikan setelah aktivitas valid selesai.

Refresh halaman tidak boleh menghasilkan XP tambahan.

---

# 11.13 Streak

## Description

Streak dihitung berdasarkan active learning day.

Active day terjadi jika pengguna menyelesaikan minimal salah satu:

```text
Lesson
Practice Session
Daily Goal
```

---

## User Story

**US-STREAK-01**

Sebagai pengguna, saya ingin mengetahui berapa hari berturut-turut saya belajar.

### Acceptance Criteria

```text
GIVEN pengguna melakukan aktivitas valid hari ini
AND melakukan aktivitas valid kemarin
THEN streak meningkat satu.
```

Jika pengguna melewatkan hari:

```text
streak = 1
```

ketika aktivitas berikutnya dilakukan.

---

# 11.14 Achievements

MVP cukup menggunakan achievement sederhana.

### Initial Achievements

```text
First Step
Complete first lesson

First Chord
Complete first chord lesson

Dedicated Learner
Complete 10 lessons

Consistent Learner
7 day streak

Practice Starter
Complete 60 minutes total practice
```

---

## User Story

**US-ACH-01**

Sebagai pengguna, saya ingin mendapatkan achievement setelah mencapai milestone tertentu.

### Acceptance Criteria

Achievement:

- hanya dapat unlocked sekali,
- tercatat pada user profile,
- menampilkan notification ketika diperoleh.

---

# 12. Detailed User Journey

## First-Time User

```text
Landing Page
↓
Register
↓
Onboarding
↓
Learning Goal
↓
Experience
↓
Guitar Type
↓
Daily Goal
↓
Assessment
↓
Placement Result
↓
Dashboard
↓
Start First Lesson
↓
Theory
↓
Practice
↓
Quiz
↓
Completion
↓
XP
↓
Dashboard
```

---

# 13. Returning User Journey

```text
Login
↓
Dashboard
↓
Continue Learning
↓
Resume Lesson
↓
Complete Lesson
↓
Progress Updated
↓
Next Lesson
```

---

# 14. Daily Learning Journey

```text
Login
↓
Dashboard
↓
Today's Goal
↓
Continue Lesson
↓
Practice
↓
Daily Goal Complete
↓
Streak Updated
```

---

# 15. Information Architecture

Primary navigation:

```text
Dashboard
Learn
Practice
Library
Progress
Profile
```

Mobile:

```text
Home
Learn
Practice
Progress
Profile
```

---

# 16. Sitemap

```text
/
├── Login
├── Register
│
├── Onboarding
│   ├── Goal
│   ├── Experience
│   ├── Guitar
│   ├── Schedule
│   ├── Assessment
│   └── Result
│
├── Dashboard
│
├── Learn
│   ├── Learning Path
│   ├── Course
│   ├── Module
│   └── Lesson
│
├── Practice
│   ├── Daily
│   ├── Chords
│   └── Transitions
│
├── Library
│   ├── Chords
│   ├── Scales
│   └── Techniques
│
├── Progress
│   ├── Learning
│   ├── Practice
│   ├── Quiz
│   └── Achievements
│
└── Profile
```

---

# 17. Functional Requirements

## FR-001 Authentication

Sistem harus dapat membuat dan mengautentikasi user.

## FR-002 User Profile

Sistem harus menyimpan user preferences.

## FR-003 Onboarding

Sistem harus menyimpan hasil onboarding.

## FR-004 Curriculum

Sistem harus dapat menampilkan course, module, dan lesson.

## FR-005 Lesson Progress

Sistem harus menyimpan progress lesson.

## FR-006 Practice

Sistem harus menyimpan practice session.

## FR-007 Quiz

Sistem harus dapat menilai quiz.

## FR-008 XP

Sistem harus menghitung dan menyimpan XP.

## FR-009 Streak

Sistem harus menghitung learning streak.

## FR-010 Progress

Sistem harus menampilkan learning analytics.

## FR-011 Achievement

Sistem harus dapat mendeteksi milestone achievement.

---

# 18. Non-Functional Requirements

## Performance

Target:

```text
Initial page load < 3 seconds
Typical navigation < 1 second
API response target < 500 ms
```

Pada kondisi network normal.

---

## Responsive Design

Platform harus usable pada:

```text
Mobile
Tablet
Desktop
```

Mobile-first direkomendasikan.

---

## Accessibility

Minimum:

- semantic HTML,
- keyboard navigation,
- alt text,
- visible focus states,
- sufficient text contrast,
- meaningful form labels.

---

## Security

Minimum:

- password hashing,
- protected routes,
- server-side authorization,
- input validation,
- secure session handling,
- CSRF protection jika relevan,
- rate limiting pada authentication endpoint.

---

## Data Integrity

Progress pengguna tidak boleh berubah hanya karena refresh.

Operation penting harus idempotent jika memungkinkan.

---

# 19. High-Level Data Model

Core entities:

```text
User
Profile
Course
Module
Lesson
LessonProgress
Chord
PracticeSession
Quiz
Question
AnswerOption
QuizAttempt
Achievement
UserAchievement
XPTransaction
```

---

# 20. Entity Relationships

```text
User
 ├── Profile
 ├── LessonProgress
 ├── PracticeSession
 ├── QuizAttempt
 ├── UserAchievement
 └── XPTransaction

Course
 └── Module
      └── Lesson
           ├── LessonProgress
           └── Quiz

Quiz
 └── Question
      └── AnswerOption
```

---

# 21. Suggested Initial Curriculum

## Module 1: Guitar Fundamentals

```text
1. Introduction to Guitar
2. Guitar Anatomy
3. How to Hold the Guitar
4. Understanding Guitar Strings
5. Basic Guitar Tuning
```

## Module 2: Basic Chords

```text
1. C Major
2. G Major
3. D Major
4. A Minor
5. E Minor
```

## Module 3: Chord Transition

```text
1. C → G
2. G → D
3. C → Am
4. Am → Em
5. Four-Chord Progression
```

## Module 4: Rhythm & Strumming

```text
1. Rhythm Basics
2. Downstroke
3. Upstroke
4. Basic Strumming Pattern
5. Chord + Rhythm Combination
```

## Module 5: Music Theory Basics

```text
1. Notes
2. Major Chord
3. Minor Chord
4. Chord Progression
5. Tempo
```

## Module 6: First Song

```text
1. Song Structure
2. Chords
3. Rhythm
4. Slow Practice
5. Full Performance
```

---

# 22. MVP Success Metrics

Metrics tidak harus sempurna pada tahap awal.

## Activation

Persentase user yang:

```text
Register
→ Complete Onboarding
→ Start First Lesson
```

Target awal:

```text
> 60%
```

---

## Lesson Completion

Persentase lesson yang dimulai lalu diselesaikan.

Target awal:

```text
> 65%
```

---

## Day-7 Retention

Pengguna yang kembali dalam tujuh hari.

Target eksploratif:

```text
> 20%
```

---

## Daily Practice Completion

Jumlah daily goal yang berhasil diselesaikan.

---

## Learning Progress

Rata-rata lesson completed per active learner.

---

# 23. Analytics Events

MVP sebaiknya melacak:

```text
user_registered
onboarding_started
onboarding_completed
assessment_completed
lesson_started
lesson_step_completed
lesson_completed
practice_started
practice_completed
quiz_started
quiz_completed
daily_goal_completed
achievement_unlocked
```

---

# 24. Error States

Platform harus memiliki handling untuk:

## Network Failure

```text
Unable to load this lesson.
Please try again.
```

## Failed Progress Save

Jangan langsung kehilangan progress.

Gunakan retry jika memungkinkan.

## Invalid Quiz Submission

Sistem tidak boleh mengirim quiz tanpa jawaban wajib.

## Unauthorized Access

Protected page harus redirect ke login.

---

# 25. Empty States

## No Practice History

```text
You haven't practiced yet.

Start your first practice session.
```

## No Achievement

```text
Your first achievement is waiting.

Complete your first lesson.
```

## No Active Lesson

```text
Ready to start?

Begin Guitar Fundamentals.
```

---

# 26. UX Requirements

## Dashboard

Primary CTA:

```text
Continue Learning
```

## Learning Path

Current lesson harus paling terlihat.

## Lesson

Tidak boleh memiliki terlalu banyak navigasi yang mengalihkan perhatian.

## Completion

User harus selalu mengetahui next step.

---

# 27. Content Requirements

Semua learning content harus:

- jelas,
- beginner-friendly,
- menggunakan istilah musik yang benar,
- menjelaskan istilah baru,
- menggunakan contoh,
- memiliki objective,
- memiliki practice,
- memiliki evaluation.

Materi tidak boleh hanya berupa paragraf teori.

---

# 28. MVP Release Criteria

MVP dianggap siap dirilis jika flow berikut dapat berjalan end-to-end:

```text
Register
↓
Complete Onboarding
↓
Open Dashboard
↓
View Learning Path
↓
Start Lesson
↓
Complete Lesson Content
↓
Practice
↓
Complete Quiz
↓
Complete Lesson
↓
Receive XP
↓
Unlock Next Lesson
↓
View Updated Progress
```

Selain itu:

- authentication stabil,
- progress tersimpan,
- refresh tidak menghapus state,
- locked lesson tidak dapat diakses tanpa permission,
- UI responsive,
- basic error handling tersedia.

---

# 29. MVP Priority

Gunakan prioritas berikut.

## P0 — Critical

```text
Authentication
Onboarding
Dashboard
Learning Path
Lesson
Lesson Progress
Practice
Quiz
Progress Tracking
```

## P1 — Important

```text
XP
Streak
Chord Library
Achievements
Resume Lesson
```

## P2 — Nice to Have

```text
Metronome
Advanced Statistics
Daily Recommendation
Custom Daily Goal
```

---

# 30. Future Roadmap

## Phase 2

```text
Metronome
Chord Transition Trainer
Strumming Trainer
Song Library
Ear Training
Scale Trainer
Better analytics
```

## Phase 3

```text
Microphone Input
Pitch Detection
Chord Detection
Audio Feedback
AI Guitar Tutor
Personalized Curriculum
Adaptive Practice
```

## Phase 4

```text
Instructor Content
Community
Challenges
Friend System
Collaborative Learning
Premium Courses
```

---

# 31. Key Product Decision

MVP harus fokus pada satu fundamental loop:

> **Learn → Practice → Quiz → Progress → Continue**

Semua fitur yang tidak memperkuat loop tersebut harus memiliki prioritas lebih rendah.

Produk tidak perlu terlihat besar pada release pertama.

Produk perlu membuat proses belajar gitar pemula terasa jelas, terstruktur, dan terukur.

---

# 32. Final MVP Definition

Versi MVP dapat didefinisikan sebagai:

> **A beginner-focused web platform that guides users through structured guitar lessons, practical exercises, quizzes, chord references, and measurable learning progress.**

Core product:

```text
Beginner Guitar
+
Structured Curriculum
+
Interactive Lesson
+
Practice
+
Quiz
+
Progress Tracking
+
Light Gamification
```

Dengan scope ini, project sudah cukup kuat untuk menunjukkan:

- product thinking,
- UI/UX,
- authentication,
- full-stack development,
- relational database design,
- state management,
- business logic,
- analytics,
- progress system,
- gamification,
- dan software engineering fundamentals.