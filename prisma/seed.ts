import { PrismaClient, Prisma, ChordType, AchievementConditionType, LessonSectionType, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting deterministic database seeding...');

  // 1. Seed Learning Goals
  const learningGoals = [
    { code: 'PLAY_FAVORITE_SONGS', name: 'Play Favorite Songs', description: 'Learn to play the music and acoustic hits you love.' },
    { code: 'LEARN_FROM_ZERO', name: 'Learn from Zero', description: 'Start from absolute scratch with proper hand placement and habits.' },
    { code: 'IMPROVE_CHORDS', name: 'Improve Chords', description: 'Master smooth, clean chord transitions without buzz.' },
    { code: 'IMPROVE_RHYTHM', name: 'Improve Rhythm', description: 'Build rock-solid internal timing and fluid strumming patterns.' },
    { code: 'UNDERSTAND_THEORY', name: 'Understand Theory', description: 'Demystify notes, scales, and how songs are constructed.' },
    { code: 'BUILD_CONFIDENCE', name: 'Build Confidence', description: 'Overcome hesitation and feel comfortable picking up the guitar.' },
  ];

  for (const goal of learningGoals) {
    await prisma.learningGoal.upsert({
      where: { code: goal.code },
      update: goal,
      create: goal,
    });
  }
  console.log(`✓ Seeded ${learningGoals.length} learning goals`);

  // 2. Seed Achievements
  const achievements = [
    {
      code: 'FIRST_STEP',
      name: 'First Step',
      description: 'Complete your first guitar lesson.',
      icon: '🎯',
      conditionType: AchievementConditionType.LESSONS_COMPLETED,
      conditionValue: 1,
      xpReward: 30,
    },
    {
      code: 'FIRST_CHORD',
      name: 'First Chord Master',
      description: 'Complete your first chord lesson and ring out clear notes.',
      icon: '🎸',
      conditionType: AchievementConditionType.LESSONS_COMPLETED,
      conditionValue: 6,
      xpReward: 50,
    },
    {
      code: 'DEDICATED_LEARNER',
      name: 'Dedicated Learner',
      description: 'Complete 10 lessons across the roadmap.',
      icon: '🔥',
      conditionType: AchievementConditionType.LESSONS_COMPLETED,
      conditionValue: 10,
      xpReward: 100,
    },
    {
      code: 'CONSISTENT_LEARNER',
      name: 'Consistent Learner',
      description: 'Maintain a 7-day practice streak.',
      icon: '⚡',
      conditionType: AchievementConditionType.CURRENT_STREAK,
      conditionValue: 7,
      xpReward: 150,
    },
    {
      code: 'PRACTICE_STARTER',
      name: 'Practice Starter',
      description: 'Accumulate 60 minutes of verified practice.',
      icon: '⏱️',
      conditionType: AchievementConditionType.PRACTICE_SECONDS,
      conditionValue: 3600,
      xpReward: 100,
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: ach,
      create: ach,
    });
  }
  console.log(`✓ Seeded ${achievements.length} achievements`);

  // 3. Seed Chords Library
  const chords = [
    {
      name: 'C Major',
      slug: 'c-major',
      type: ChordType.MAJOR,
      difficulty: 'BEGINNER',
      notes: ['C', 'E', 'G'],
      diagramData: { strings: ['X', 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1 },
      description: 'One of the most essential open chords in popular music. Keep your 3rd finger curved so the open 3rd string rings clean.',
    },
    {
      name: 'G Major',
      slug: 'g-major',
      type: ChordType.MAJOR,
      difficulty: 'BEGINNER',
      notes: ['G', 'B', 'D'],
      diagramData: { strings: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1 },
      description: 'A rich, resonant chord spanning all six strings. Ideal for acoustic strumming anthems.',
    },
    {
      name: 'D Major',
      slug: 'd-major',
      type: ChordType.MAJOR,
      difficulty: 'BEGINNER',
      notes: ['D', 'F#', 'A'],
      diagramData: { strings: ['X', 'X', 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1 },
      description: 'A bright triangular chord played from the open 4th string down. Take care not to strike the low E or A strings.',
    },
    {
      name: 'A Major',
      slug: 'a-major',
      type: ChordType.MAJOR,
      difficulty: 'BEGINNER',
      notes: ['A', 'C#', 'E'],
      diagramData: { strings: ['X', 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1 },
      description: 'Three fingers clustered together tightly on the 2nd fret of strings 4, 3, and 2. Keep fingertips vertical.',
    },
    {
      name: 'E Major',
      slug: 'e-major',
      type: ChordType.MAJOR,
      difficulty: 'BEGINNER',
      notes: ['E', 'G#', 'B'],
      diagramData: { strings: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1 },
      description: 'Full-bodied six-string powerhouse chord. Forms the foundational shape for rock, blues, and folk.',
    },
    {
      name: 'A Minor',
      slug: 'a-minor',
      type: ChordType.MINOR,
      difficulty: 'BEGINNER',
      notes: ['A', 'C', 'E'],
      diagramData: { strings: ['X', 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], baseFret: 1 },
      description: 'A soulful, melancholic chord with the same finger shape as E Major, just shifted one string down.',
    },
    {
      name: 'E Minor',
      slug: 'e-minor',
      type: ChordType.MINOR,
      difficulty: 'BEGINNER',
      notes: ['E', 'G', 'B'],
      diagramData: { strings: [0, 2, 2, 0, 0, 0], fingers: [0, 1, 2, 0, 0, 0], baseFret: 1 },
      description: 'Often the very first chord beginners learn. Requires only two fingers on the 2nd fret.',
    },
    {
      name: 'D Minor',
      slug: 'd-minor',
      type: ChordType.MINOR,
      difficulty: 'BEGINNER',
      notes: ['D', 'F', 'A'],
      diagramData: { strings: ['X', 'X', 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], baseFret: 1 },
      description: 'Expressive and emotional minor chord. Watch your index finger on string 1 fret 1.',
    },
    {
      name: 'F Major',
      slug: 'f-major',
      type: ChordType.MAJOR,
      difficulty: 'INTERMEDIATE',
      notes: ['F', 'A', 'C'],
      diagramData: { strings: ['X', 'X', 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], baseFret: 1 },
      description: 'Beginner-friendly mini-barre version of F Major, barring strings 1 and 2 with the first finger.',
    },
    {
      name: 'B7',
      slug: 'b7',
      type: ChordType.SEVENTH,
      difficulty: 'INTERMEDIATE',
      notes: ['B', 'D#', 'F#', 'A'],
      diagramData: { strings: ['X', 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], baseFret: 1 },
      description: 'The classic blues transition chord. Uses all 4 fretting fingers across five strings.',
    },
  ];

  for (const chord of chords) {
    await prisma.chord.upsert({
      where: { slug: chord.slug },
      update: chord,
      create: chord,
    });
  }
  console.log(`✓ Seeded ${chords.length} chords in library`);

  // 4. Seed Main MVP Course: Beginner Guitar Fundamentals
  const course = await prisma.course.upsert({
    where: { slug: 'beginner-guitar-fundamentals' },
    update: {
      title: 'Beginner Guitar Fundamentals',
      description: 'The complete, step-by-step guitar roadmap taking you from holding your first pick to playing your first full song.',
      difficulty: 'BEGINNER',
      order: 1,
      published: true,
    },
    create: {
      title: 'Beginner Guitar Fundamentals',
      slug: 'beginner-guitar-fundamentals',
      description: 'The complete, step-by-step guitar roadmap taking you from holding your first pick to playing your first full song.',
      difficulty: 'BEGINNER',
      order: 1,
      published: true,
    },
  });

  // 5. Seed 6 Modules & 30 Lessons
  const modulesData = [
    {
      order: 1,
      title: 'Guitar Fundamentals',
      slug: 'guitar-fundamentals',
      description: 'Get acquainted with your instrument, anatomy, posture, and essential tuning.',
      lessons: [
        {
          order: 1,
          title: 'Introduction to Guitar',
          slug: 'intro-to-guitar',
          description: 'Welcome to your guitar journey! Discover how the guitar works and set yourself up for success.',
          difficulty: 'ABSOLUTE_BEGINNER',
          estimatedMinutes: 8,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'Welcome to the Guitar!',
              content: 'Learning the guitar is one of the most rewarding journeys you will ever undertake. In this course, you will progress systematically step-by-step without unnecessary confusion.',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.TIP,
              title: 'The Golden Rule of Practice',
              content: 'Practicing for 15 focused minutes every day is 10x more effective than practicing for 2 hours once a week. Your fingers need daily adaptation.',
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.PRACTICE,
              title: 'Unbox & Hold Your Guitar',
              content: 'Take your guitar out of its case or stand. Rest it on your right leg (or left if classical) and place your right arm over the upper bout.',
              required: true,
            },
            {
              order: 4,
              type: LessonSectionType.SUMMARY,
              title: 'Lesson Summary',
              content: 'You took your first step! Consistency beats intensity. In the next lesson, we break down every part of the guitar.',
              required: true,
            },
          ],
          quiz: {
            title: 'Introduction Check',
            description: 'Quick check to confirm key beginner mindset concepts.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'What is the most effective way for beginners to build finger memory?',
                explanation: 'Short, daily sessions build muscle memory and finger calluses much faster without causing strain.',
                options: [
                  { text: '15 minutes daily consistent practice', isCorrect: true, order: 1 },
                  { text: '3 hours once every weekend', isCorrect: false, order: 2 },
                  { text: 'Practicing only when you feel inspired', isCorrect: false, order: 3 },
                  { text: 'Playing as fast as possible on day one', isCorrect: false, order: 4 },
                ],
              },
              {
                order: 2,
                type: QuestionType.TRUE_FALSE,
                prompt: 'You need prior music theory knowledge before you can start learning guitar.',
                explanation: 'Guitar can be learned practically from zero without any prior background in formal music theory.',
                options: [
                  { text: 'True', isCorrect: false, order: 1 },
                  { text: 'False', isCorrect: true, order: 2 },
                ],
              },
            ],
          },
        },
        {
          order: 2,
          title: 'Guitar Anatomy',
          slug: 'guitar-anatomy',
          description: 'Learn the key components: headstock, frets, neck, body, bridge, and soundhole.',
          difficulty: 'ABSOLUTE_BEGINNER',
          estimatedMinutes: 10,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The 3 Main Sections of a Guitar',
              content: 'Every guitar consists of three main anatomical regions: The Headstock (tuning pegs), The Neck (fingerboard and frets), and The Body (resonating chamber and bridge).',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.WARNING,
              title: 'Fret Wires vs Fret Spaces',
              content: 'When a lesson says "place your finger on the 2nd fret", place your finger in the wooden space just behind the metal fret wire, never directly on top of it!',
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.SUMMARY,
              title: 'Anatomy Checklist',
              content: 'Knowing your instrument parts will help you communicate clearly as we dive into chords and technique.',
              required: true,
            },
          ],
          quiz: {
            title: 'Guitar Anatomy Quiz',
            description: 'Test your knowledge of guitar components.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'Where should your fingertip be placed relative to the metal fret wire?',
                explanation: 'Placing your finger just behind the metal wire produces the cleanest tone with minimum finger pressure.',
                options: [
                  { text: 'Just behind the fret wire, in the fret space', isCorrect: true, order: 1 },
                  { text: 'Directly on top of the metal fret wire', isCorrect: false, order: 2 },
                  { text: 'As far away from the fret wire as possible', isCorrect: false, order: 3 },
                  { text: 'Over two frets at once', isCorrect: false, order: 4 },
                ],
              },
              {
                order: 2,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'Where are the tuning pegs located on a standard guitar?',
                explanation: 'The tuning pegs/machine heads are mounted on the headstock at the top of the neck.',
                options: [
                  { text: 'Headstock', isCorrect: true, order: 1 },
                  { text: 'Bridge', isCorrect: false, order: 2 },
                  { text: 'Soundhole', isCorrect: false, order: 3 },
                  { text: 'Pickguard', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
        {
          order: 3,
          title: 'How to Hold the Guitar',
          slug: 'how-to-hold-the-guitar',
          description: 'Master posture, thumb positioning, and avoiding wrist tension.',
          difficulty: 'ABSOLUTE_BEGINNER',
          estimatedMinutes: 10,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'Sitting Posture Basics',
              content: 'Sit upright on a stable chair without armrests. Keep your back straight and shoulders relaxed. Rest the waist of the guitar on your dominant leg.',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.TIP,
              title: 'The Thumb Behind the Neck',
              content: 'Your fretting thumb should rest flat behind the middle of the neck, acting as an anchor. Do not squeeze the neck with a baseball-bat grip.',
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.SUMMARY,
              title: 'Posture Checklist',
              content: 'Relaxed shoulders, curved fingers, thumb anchored behind neck.',
              required: true,
            },
          ],
          quiz: {
            title: 'Posture & Ergonomics',
            description: 'Check your understanding of healthy guitar posture.',
            questions: [
              {
                order: 1,
                type: QuestionType.TRUE_FALSE,
                prompt: 'You should squeeze the neck as hard as you can with your palm to hold the guitar.',
                explanation: 'Squeezing creates severe hand fatigue and slows down finger movement. The thumb should be a relaxed pivot.',
                options: [
                  { text: 'True', isCorrect: false, order: 1 },
                  { text: 'False', isCorrect: true, order: 2 },
                ],
              },
            ],
          },
        },
        {
          order: 4,
          title: 'Understanding Guitar Strings',
          slug: 'understanding-guitar-strings',
          description: 'Learn the string numbering system and standard tuning notes (E-A-D-G-B-e).',
          difficulty: 'ABSOLUTE_BEGINNER',
          estimatedMinutes: 10,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'String Numbers & Pitches',
              content: 'Guitars have 6 strings, numbered 1 to 6 from thinnest to thickest. String 1 is high E, String 6 is low E.',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.TIP,
              title: 'Memory Mnemonic',
              content: 'Remember strings 6 to 1 with: "Eddie Ate Dynamite, Good Bye Eddie" (E - A - D - G - B - E).',
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.SUMMARY,
              title: 'String System Mastered',
              content: '1st = High E (thinnest), 6th = Low E (thickest).',
              required: true,
            },
          ],
          quiz: {
            title: 'Strings Quiz',
            description: 'Test your recall of string numbering and notes.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'Which string is the 1st string on the guitar?',
                explanation: 'The 1st string is the thinnest string at the very bottom (high E).',
                options: [
                  { text: 'The thinnest string (High E)', isCorrect: true, order: 1 },
                  { text: 'The thickest string (Low E)', isCorrect: false, order: 2 },
                  { text: 'The middle string (G)', isCorrect: false, order: 3 },
                  { text: 'The D string', isCorrect: false, order: 4 },
                ],
              },
              {
                order: 2,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'What is standard guitar tuning from thickest string (6th) to thinnest (1st)?',
                explanation: 'Standard tuning is E - A - D - G - B - E.',
                options: [
                  { text: 'E - A - D - G - B - E', isCorrect: true, order: 1 },
                  { text: 'E - B - G - D - A - E', isCorrect: false, order: 2 },
                  { text: 'C - D - E - F - G - A', isCorrect: false, order: 3 },
                  { text: 'A - B - C - D - E - F', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
        {
          order: 5,
          title: 'Basic Guitar Tuning',
          slug: 'basic-guitar-tuning',
          description: 'How to tune your guitar accurately using a clip-on tuner or mobile app.',
          difficulty: 'ABSOLUTE_BEGINNER',
          estimatedMinutes: 12,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'Why Tuning Matters Every Session',
              content: 'Wood expands and contracts with humidity and temperature. Always tune your guitar before every single practice session.',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.TIP,
              title: 'Always Tune Up to Pitch',
              content: 'If a string is sharp (too high), detune it slightly lower than the target pitch, then tune UP to pitch. This keeps peg tension stable.',
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.SUMMARY,
              title: 'Module 1 Complete!',
              content: 'Congratulations! You now know your guitar, posture, strings, and tuning. Module 2 begins real chord playing!',
              required: true,
            },
          ],
          quiz: {
            title: 'Tuning Essentials',
            description: 'Verify your tuning methodology.',
            questions: [
              {
                order: 1,
                type: QuestionType.TRUE_FALSE,
                prompt: 'Guitars stay in tune forever and only need tuning once a month.',
                explanation: 'Guitars slip out of tune due to string tension and temperature changes; tune before each practice session.',
                options: [
                  { text: 'True', isCorrect: false, order: 1 },
                  { text: 'False', isCorrect: true, order: 2 },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      order: 2,
      title: 'Basic Chords',
      slug: 'basic-chords',
      description: 'Master the 5 essential open chords: C, G, D, Am, and Em.',
      lessons: [
        {
          order: 6,
          title: 'C Major',
          slug: 'c-major-lesson',
          description: 'Learn finger placements and clean string strumming for open C Major.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 15,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The C Major Chord Shape',
              content: 'C Major is constructed from C, E, and G notes. Finger 1 on 2nd string (fret 1), Finger 2 on 4th string (fret 2), Finger 3 on 5th string (fret 3).',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.CHORD,
              title: 'Chord Diagram: C Major',
              content: 'Strum only strings 5 through 1. Avoid striking string 6 (Low E).',
              mediaUrl: 'c-major',
              metadata: { chordSlug: 'c-major' },
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.TIP,
              title: 'Fingertip Arch',
              content: 'Arch your fingers high on their tips so they do not inadvertently mute adjacent open strings.',
              required: true,
            },
            {
              order: 4,
              type: LessonSectionType.PRACTICE,
              title: 'One-By-One String Test',
              content: 'Pick each string individually from string 5 to 1. Ensure every single note rings clear without buzz.',
              required: true,
            },
            {
              order: 5,
              type: LessonSectionType.SUMMARY,
              title: 'C Major Mastered',
              content: 'You just learned your first major chord! Next up: G Major.',
              required: true,
            },
          ],
          quiz: {
            title: 'C Major Identification',
            description: 'Check your knowledge of C Major.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'Which string should you NOT strum when playing open C Major?',
                explanation: 'The 6th string (low E) is not part of standard open C Major and is marked with an X (muted).',
                options: [
                  { text: '6th string (Low E)', isCorrect: true, order: 1 },
                  { text: '1st string (High E)', isCorrect: false, order: 2 },
                  { text: '3rd string (G)', isCorrect: false, order: 3 },
                  { text: '5th string (A)', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
        {
          order: 7,
          title: 'G Major',
          slug: 'g-major-lesson',
          description: 'The golden acoustic chord: full 6-string resonance.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 15,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The G Major Shape',
              content: 'G Major utilizes all 6 strings. Finger 2 on string 6 (fret 3), Finger 1 on string 5 (fret 2), Finger 3 on string 1 (fret 3).',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.CHORD,
              title: 'G Major Diagram',
              content: 'A huge sounding chord found in thousands of hit songs.',
              mediaUrl: 'g-major',
              metadata: { chordSlug: 'g-major' },
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.SUMMARY,
              title: 'G Major Mastered',
              content: 'Great job! Strum from 6th string to 1st.',
              required: true,
            },
          ],
          quiz: {
            title: 'G Major Quiz',
            description: 'Test your understanding of G Major.',
            questions: [
              {
                order: 1,
                type: QuestionType.TRUE_FALSE,
                prompt: 'G Major uses all six strings when strummed in open position.',
                explanation: 'Yes, standard open G Major sounds all strings from low E to high E.',
                options: [
                  { text: 'True', isCorrect: true, order: 1 },
                  { text: 'False', isCorrect: false, order: 2 },
                ],
              },
            ],
          },
        },
        {
          order: 8,
          title: 'D Major',
          slug: 'd-major-lesson',
          description: 'The compact triangle chord on the top 4 strings.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 15,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The D Major Triangle',
              content: 'D Major forms a small triangle on strings 1, 2, and 3. Strum only the top 4 strings (strings 4 to 1).',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.CHORD,
              title: 'D Major Diagram',
              content: 'Root note is on the open 4th string (D).',
              mediaUrl: 'd-major',
              metadata: { chordSlug: 'd-major' },
              required: true,
            },
          ],
          quiz: {
            title: 'D Major Quiz',
            description: 'Test D Major string boundaries.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'Which open string is the root note of the open D Major chord?',
                explanation: 'Open string 4 (D) is the root note.',
                options: [
                  { text: '4th string (D)', isCorrect: true, order: 1 },
                  { text: '6th string (E)', isCorrect: false, order: 2 },
                  { text: '5th string (A)', isCorrect: false, order: 3 },
                  { text: '1st string (E)', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
        {
          order: 9,
          title: 'A Minor',
          slug: 'a-minor-lesson',
          description: 'Your first minor chord: emotional, smooth, and expressive.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 15,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The A Minor Shape',
              content: 'A Minor sounds mellow and somber. Notice how the shape mirrors E Major shifted over by one string.',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.CHORD,
              title: 'A Minor Diagram',
              content: 'Strum from string 5 (A) downwards.',
              mediaUrl: 'a-minor',
              metadata: { chordSlug: 'a-minor' },
              required: true,
            },
          ],
          quiz: {
            title: 'A Minor Quiz',
            description: 'Identify the A Minor chord characteristics.',
            questions: [
              {
                order: 1,
                type: QuestionType.TRUE_FALSE,
                prompt: 'A Minor typically has a sadder or more emotional sound compared to A Major.',
                explanation: 'Minor chords are characterized by their minor third interval, giving them a somber/emotional quality.',
                options: [
                  { text: 'True', isCorrect: true, order: 1 },
                  { text: 'False', isCorrect: false, order: 2 },
                ],
              },
            ],
          },
        },
        {
          order: 10,
          title: 'E Minor',
          slug: 'e-minor-lesson',
          description: 'Two fingers only! The ultimate beginner gateway chord.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 12,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'Simplicity of E Minor',
              content: 'Only strings 5 and 4 are fretted on fret 2. All other 4 strings ring open.',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.CHORD,
              title: 'E Minor Diagram',
              content: 'Strum all 6 strings boldly.',
              mediaUrl: 'e-minor',
              metadata: { chordSlug: 'e-minor' },
              required: true,
            },
            {
              order: 3,
              type: LessonSectionType.SUMMARY,
              title: 'Module 2 Complete!',
              content: 'You now possess C, G, D, Am, and Em! These 5 chords allow you to play hundreds of songs.',
              required: true,
            },
          ],
          quiz: {
            title: 'E Minor Quiz',
            description: 'Confirm E Minor fingers.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'How many fingers are used to fret standard open E Minor?',
                explanation: 'Only two fingers are needed on strings 5 and 4 at the 2nd fret.',
                options: [
                  { text: '2 fingers', isCorrect: true, order: 1 },
                  { text: '3 fingers', isCorrect: false, order: 2 },
                  { text: '4 fingers', isCorrect: false, order: 3 },
                  { text: '1 finger', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      order: 3,
      title: 'Chord Transition',
      slug: 'chord-transition',
      description: 'The secret to fluid playing: anchor fingers, pivot points, and smooth shifts.',
      lessons: [
        {
          order: 11,
          title: 'C → G Transition',
          slug: 'c-to-g-transition',
          description: 'Smooth shifting between the two most ubiquitous chords.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 15,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The Challenge of C to G',
              content: 'C to G requires moving multiple fingers. The key is to move fingers together as a unit rather than one by one.',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.TIP,
              title: 'The 1-Minute Change Exercise',
              content: 'Count how many clean changes you can make between C and G in 60 seconds. Strive for 30+ changes.',
              required: true,
            },
          ],
          quiz: {
            title: 'Transition Strategy',
            description: 'Evaluate transition habits.',
            questions: [
              {
                order: 1,
                type: QuestionType.TRUE_FALSE,
                prompt: 'When changing chords, moving all fingers together simultaneously is better than planting them one-by-one.',
                explanation: 'Simultaneous finger movement keeps rhythm steady and prevents stuttering.',
                options: [
                  { text: 'True', isCorrect: true, order: 1 },
                  { text: 'False', isCorrect: false, order: 2 },
                ],
              },
            ],
          },
        },
        {
          order: 12,
          title: 'G → D Transition',
          slug: 'g-to-d-transition',
          description: 'Using the ring finger as an anchor point between G and D.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 15,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The Anchor Finger Trick',
              content: 'If you use Finger 3 on the 2nd string (fret 3) for G, it never has to lift when changing to D Major!',
              required: true,
            },
          ],
          quiz: {
            title: 'Anchor Principle',
            description: 'Test anchor technique.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'What is an "anchor finger" in guitar chord transitions?',
                explanation: 'A finger that stays glued to the same string/fret across both chords, providing stability.',
                options: [
                  { text: 'A finger that remains planted while other fingers reposition', isCorrect: true, order: 1 },
                  { text: 'A finger used only on the bass string', isCorrect: false, order: 2 },
                  { text: 'Your thumb behind the neck', isCorrect: false, order: 3 },
                  { text: 'A finger that presses all six strings', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
        {
          order: 13,
          title: 'C → Am Transition',
          slug: 'c-to-am-transition',
          description: 'One single finger move: the easiest transition in music.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 12,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'Moving Only Ring Finger',
              content: 'Notice C and Am share fingers 1 and 2 in exact same spots! Only finger 3 lifts and moves from string 5 to string 3.',
              required: true,
            },
          ],
          quiz: {
            title: 'C to Am Quiz',
            description: 'Test transition efficiency.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'How many fingers need to change position when moving from C Major to A Minor?',
                explanation: 'Only finger 3 moves; fingers 1 and 2 stay in place.',
                options: [
                  { text: 'Only 1 finger', isCorrect: true, order: 1 },
                  { text: 'All 3 fingers', isCorrect: false, order: 2 },
                  { text: '2 fingers', isCorrect: false, order: 3 },
                  { text: '0 fingers', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
        {
          order: 14,
          title: 'Am → Em Transition',
          slug: 'am-to-em-transition',
          description: 'Shifting the 2-finger block upwards.',
          difficulty: 'BEGINNER',
          estimatedMinutes: 12,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The Vertical Lift',
              content: 'Lift finger 1, then shift fingers 2 and 3 one string up towards the ceiling to hit strings 5 and 4.',
              required: true,
            },
          ],
          quiz: {
            title: 'Am to Em Quiz',
            description: 'Evaluate minor transition.',
            questions: [
              {
                order: 1,
                type: QuestionType.TRUE_FALSE,
                prompt: 'Fingers 2 and 3 retain their relative spacing during the Am to Em shift.',
                explanation: 'Yes, keeping their relative spacing allows seamless sliding up to strings 5 and 4.',
                options: [
                  { text: 'True', isCorrect: true, order: 1 },
                  { text: 'False', isCorrect: false, order: 2 },
                ],
              },
            ],
          },
        },
        {
          order: 15,
          title: 'Four-Chord Progression',
          slug: 'four-chord-progression',
          description: 'Combine G → D → Em → C: the legendary pop progression!',
          difficulty: 'BEGINNER',
          estimatedMinutes: 20,
          xpReward: 20,
          sections: [
            {
              order: 1,
              type: LessonSectionType.TEXT,
              title: 'The 4 Chords That Rule The World',
              content: 'G, D, Em, and C form the backbone of hundreds of global hit songs (from "Let It Be" to "Someone Like You").',
              required: true,
            },
            {
              order: 2,
              type: LessonSectionType.PRACTICE,
              title: 'Looping the 4 Chords',
              content: 'Play 4 steady downstrums per chord without stopping between changes.',
              required: true,
            },
          ],
          quiz: {
            title: 'Progression Mastery',
            description: 'Test progression structure.',
            questions: [
              {
                order: 1,
                type: QuestionType.MULTIPLE_CHOICE,
                prompt: 'In a 4-beat measure, how many downstrums do you play per chord at 1 strum per beat?',
                explanation: 'Four downstrums correspond to 4 beats in standard 4/4 time.',
                options: [
                  { text: '4 strums', isCorrect: true, order: 1 },
                  { text: '2 strums', isCorrect: false, order: 2 },
                  { text: '8 strums', isCorrect: false, order: 3 },
                  { text: '1 strum', isCorrect: false, order: 4 },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      order: 4,
      title: 'Rhythm & Strumming',
      slug: 'rhythm-and-strumming',
      description: 'Develop internal clock, downstrokes, upstrokes, and classic strumming patterns.',
      lessons: [
        { order: 16, title: 'Rhythm Basics', slug: 'rhythm-basics', description: 'Understanding pulse, tempo, 4/4 time signature, and counting out loud.', difficulty: 'BEGINNER', estimatedMinutes: 12, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'The Pulse of Music', content: 'Rhythm is what makes chords feel alive. In 4/4 time, we count: 1 - 2 - 3 - 4.', required: true }], quiz: { title: 'Rhythm Quiz', description: 'Confirm pulse.', questions: [{ order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: 'What does 4/4 time signify?', explanation: '4 beats per measure, with a quarter note receiving one beat.', options: [{ text: '4 beats per measure', isCorrect: true, order: 1 }, { text: '4 strings only', isCorrect: false, order: 2 }] }] } },
        { order: 17, title: 'Downstroke', slug: 'downstroke-technique', description: 'Relaxed wrist motion and brushing evenly across the strings downwards.', difficulty: 'BEGINNER', estimatedMinutes: 12, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Wrist Over Elbow', content: 'Let your strum come from a loose, flexible wrist rather than your entire forearm.', required: true }], quiz: { title: 'Downstroke Quiz', description: 'Check stroke mechanics.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'Your wrist should remain completely stiff and rigid during downstrums.', explanation: 'A stiff wrist produces harsh sound and causes early fatigue. Keep it fluid.', options: [{ text: 'True', isCorrect: false, order: 1 }, { text: 'False', isCorrect: true, order: 2 }] }] } },
        { order: 18, title: 'Upstroke', slug: 'upstroke-technique', description: 'Catching strings on the rebound without pick snagging.', difficulty: 'BEGINNER', estimatedMinutes: 12, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Light Rebound', content: 'Upstrokes only need to brush the top 3 or 4 strings lightly on the way back up.', required: true }], quiz: { title: 'Upstroke Quiz', description: 'Verify upstroke brush.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'Upstrokes should brush the strings gently on the upward return motion.', explanation: 'Correct, upstrokes are lighter accents compared to solid downstrums.', options: [{ text: 'True', isCorrect: true, order: 1 }, { text: 'False', isCorrect: false, order: 2 }] }] } },
        { order: 19, title: 'Basic Strumming Pattern', slug: 'basic-strumming-pattern', description: 'The famous "Down, Down-Up, Up-Down" pattern that fits thousands of acoustic songs.', difficulty: 'BEGINNER', estimatedMinutes: 18, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'The Universal Folk Strum', content: 'Count: 1, 2 &, (&), 4 &. Notice the ghost swing on beat 3!', required: true }], quiz: { title: 'Pattern Quiz', description: 'Verify pattern.', questions: [{ order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: 'In rhythmic strumming, what should your strumming hand do on missed beats (ghost strums)?', explanation: 'Keep moving in rhythm to maintain tempo without making contact.', options: [{ text: 'Keep swinging up and down without touching strings', isCorrect: true, order: 1 }, { text: 'Freeze in mid-air', isCorrect: false, order: 2 }] }] } },
        { order: 20, title: 'Chord + Rhythm Combination', slug: 'chord-plus-rhythm', description: 'Syncing left-hand chord fretting with right-hand strumming cadence.', difficulty: 'BEGINNER', estimatedMinutes: 20, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Putting It Together', content: 'Play our 4-chord progression while maintaining the universal strumming pattern.', required: true }], quiz: { title: 'Coordination Quiz', description: 'Check sync concept.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'Rhythm should continue without stopping even if a chord change feels tricky.', explanation: 'Prioritizing time over perfection trains your hands to transition on beat.', options: [{ text: 'True', isCorrect: true, order: 1 }, { text: 'False', isCorrect: false, order: 2 }] }] } },
      ],
    },
    {
      order: 5,
      title: 'Music Theory Basics',
      slug: 'music-theory-basics',
      description: 'Demystify musical notes, intervals, chords construction, and tempo markings.',
      lessons: [
        { order: 21, title: 'Musical Notes', slug: 'musical-notes', description: 'The 12 notes of Western music: natural notes and sharps/flats.', difficulty: 'BEGINNER', estimatedMinutes: 15, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'The Chromatic Scale', content: 'All music is built on 12 distinct pitches. B/C and E/F have no sharp between them.', required: true }], quiz: { title: 'Notes Quiz', description: 'Test note basics.', questions: [{ order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: 'Between which note pairs is there NO sharp (#) in standard music theory?', explanation: 'B to C and E to F are natural half steps with no intervening sharp/flat.', options: [{ text: 'B to C and E to F', isCorrect: true, order: 1 }, { text: 'C to D and G to A', isCorrect: false, order: 2 }] }] } },
        { order: 22, title: 'Major Chords Theory', slug: 'major-chords-theory', description: 'Root, Major 3rd, and Perfect 5th: the formula of brightness.', difficulty: 'BEGINNER', estimatedMinutes: 15, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'The Major Triad Formula', content: 'Major chords combine scale degrees 1, 3, and 5 (4 semitones then 3 semitones).', required: true }], quiz: { title: 'Major Triad Quiz', description: 'Verify formula.', questions: [{ order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: 'How many notes comprise a standard major triad?', explanation: 'A triad has 3 notes: Root, 3rd, and 5th.', options: [{ text: '3 notes', isCorrect: true, order: 1 }, { text: '4 notes', isCorrect: false, order: 2 }] }] } },
        { order: 23, title: 'Minor Chords Theory', slug: 'minor-chords-theory', description: 'Flattening the 3rd: how one half-step creates sadness.', difficulty: 'BEGINNER', estimatedMinutes: 15, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'The Minor Triad Formula', content: 'A minor chord drops the 3rd by one fret (flat 3rd), altering the emotional tone.', required: true }], quiz: { title: 'Minor Triad Quiz', description: 'Check minor interval.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'The only difference between a Major and Minor chord is the 3rd scale degree.', explanation: 'True! Root and 5th stay identical; only the 3rd changes by one half-step.', options: [{ text: 'True', isCorrect: true, order: 1 }, { text: 'False', isCorrect: false, order: 2 }] }] } },
        { order: 24, title: 'Chord Progressions', slug: 'chord-progressions-theory', description: 'Roman numerals (I, IV, V, vi) and why chords harmonize naturally.', difficulty: 'BEGINNER', estimatedMinutes: 15, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'The Roman Numeral System', content: 'In the key of G Major: G is I, C is IV, D is V, and Em is vi.', required: true }], quiz: { title: 'Roman Numerals', description: 'Test roman numeral concept.', questions: [{ order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: 'In the Key of G Major, what chord is the "V" (five) chord?', explanation: 'Counting G(I), A(ii), B(iii), C(IV), D(V) gives D Major.', options: [{ text: 'D Major', isCorrect: true, order: 1 }, { text: 'C Major', isCorrect: false, order: 2 }, { text: 'E Minor', isCorrect: false, order: 3 }] }] } },
        { order: 25, title: 'Tempo & Metronome', slug: 'tempo-and-metronome', description: 'BPM (Beats Per Minute) and how to practice effectively with a click.', difficulty: 'BEGINNER', estimatedMinutes: 12, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Playing with a Metronome', content: 'Start slow (60 BPM). Only speed up once you can execute 5 consecutive flawless loops.', required: true }], quiz: { title: 'Metronome Strategy', description: 'Test tempo discipline.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'Practicing slowly with a metronome builds clean speed faster than playing sloppy at high BPM.', explanation: 'Accurate slow repetition cements clean neural pathways for fast execution.', options: [{ text: 'True', isCorrect: true, order: 1 }, { text: 'False', isCorrect: false, order: 2 }] }] } },
      ],
    },
    {
      order: 6,
      title: 'First Song',
      slug: 'first-song',
      description: 'Put it all together into a complete musical performance: structure, transitions, and playthrough.',
      lessons: [
        { order: 26, title: 'Song Structure', slug: 'song-structure', description: 'Intro, Verse, Chorus, Bridge, and Outro explained.', difficulty: 'BEGINNER', estimatedMinutes: 12, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Anatomy of a Song', content: 'Verses tell the story; the Chorus delivers the emotional climax and memorable hook.', required: true }], quiz: { title: 'Song Structure Quiz', description: 'Test structure.', questions: [{ order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: 'Which section of a song usually carries the central catchy hook?', explanation: 'The chorus repeats the primary melody and hook.', options: [{ text: 'Chorus', isCorrect: true, order: 1 }, { text: 'Verse', isCorrect: false, order: 2 }] }] } },
        { order: 27, title: 'Chord Preparation', slug: 'song-chord-preparation', description: 'Rehearsing the specific chord cycle for our graduation song.', difficulty: 'BEGINNER', estimatedMinutes: 15, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Song Chords: G - D - Em - C', content: 'Confirm all 4 chord voicings are crisp and ready for real-time playing.', required: true }], quiz: { title: 'Prep Check', description: 'Check preparedness.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'You should be able to form all 4 chords without looking at chord charts.', explanation: 'Fret memory allows you to focus purely on musical dynamics and timing.', options: [{ text: 'True', isCorrect: true, order: 1 }, { text: 'False', isCorrect: false, order: 2 }] }] } },
        { order: 28, title: 'Rhythm Preparation', slug: 'song-rhythm-preparation', description: 'Locking into 80 BPM with consistent acoustic strum dynamics.', difficulty: 'BEGINNER', estimatedMinutes: 15, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Setting the Groove', content: 'Mute strings with your left hand and practice the strumming pattern until it is second nature.', required: true }], quiz: { title: 'Groove Check', description: 'Verify groove.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'Muted strumming lets you focus exclusively on right-hand rhythm.', explanation: 'Yes, percussive muted practice isolates rhythm from fretting pressure.', options: [{ text: 'True', isCorrect: true, order: 1 }, { text: 'False', isCorrect: false, order: 2 }] }] } },
        { order: 29, title: 'Slow Practice', slug: 'song-slow-practice', description: 'Playing through the full verse and chorus loop at 60 BPM.', difficulty: 'BEGINNER', estimatedMinutes: 20, xpReward: 20, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'The Slow Rehearsal', content: 'Play two full loops of Verse and Chorus without stopping.', required: true }], quiz: { title: 'Slow Playthrough', description: 'Check mastery.', questions: [{ order: 1, type: QuestionType.TRUE_FALSE, prompt: 'Reaching the end of the loop without pausing is the goal of slow practice.', explanation: 'Continuous flow without stopping demonstrates real song-ready mastery.', options: [{ text: 'True', isCorrect: true, order: 1 }, { text: 'False', isCorrect: false, order: 2 }] }] } },
        { order: 30, title: 'Full Playthrough', slug: 'song-full-playthrough', description: 'Your graduation performance: play the full song from start to finish!', difficulty: 'BEGINNER', estimatedMinutes: 25, xpReward: 50, sections: [{ order: 1, type: LessonSectionType.TEXT, title: 'Graduation Performance', content: 'Play Intro, Verse 1, Chorus, Verse 2, Chorus, and Outro at full tempo! You are officially a guitar player.', required: true }, { order: 2, type: LessonSectionType.SUMMARY, title: 'Course Complete!', content: 'Congratulations! You have completed the Beginner Guitar Fundamentals roadmap. Keep practicing daily to continue advancing!', required: true }], quiz: { title: 'Final Certification Quiz', description: 'Comprehensive check of beginner guitar mastery.', questions: [{ order: 1, type: QuestionType.MULTIPLE_CHOICE, prompt: 'What is the true secret to lifelong guitar progression?', explanation: 'Daily consistent engagement with structured, deliberate goals.', options: [{ text: 'Daily consistent practice with focused goals', isCorrect: true, order: 1 }, { text: 'Buying expensive guitars every month', isCorrect: false, order: 2 }, { text: 'Playing fast and ignoring rhythm', isCorrect: false, order: 3 }] }] } },
      ],
    },
  ];

  let totalLessonsSeeded = 0;
  for (const modData of modulesData) {
    const mod = await prisma.module.upsert({
      where: {
        courseId_slug: {
          courseId: course.id,
          slug: modData.slug,
        },
      },
      update: {
        title: modData.title,
        description: modData.description,
        order: modData.order,
      },
      create: {
        courseId: course.id,
        title: modData.title,
        slug: modData.slug,
        description: modData.description,
        order: modData.order,
      },
    });

    for (const lesData of modData.lessons) {
      const lesson = await prisma.lesson.upsert({
        where: {
          moduleId_slug: {
            moduleId: mod.id,
            slug: lesData.slug,
          },
        },
        update: {
          title: lesData.title,
          description: lesData.description,
          difficulty: lesData.difficulty,
          estimatedMinutes: lesData.estimatedMinutes,
          xpReward: lesData.xpReward,
          order: lesData.order,
          published: true,
        },
        create: {
          moduleId: mod.id,
          title: lesData.title,
          slug: lesData.slug,
          description: lesData.description,
          difficulty: lesData.difficulty,
          estimatedMinutes: lesData.estimatedMinutes,
          xpReward: lesData.xpReward,
          order: lesData.order,
          published: true,
        },
      });

      // Seed Sections
      for (const rawSec of lesData.sections) {
        const secData = rawSec as {
          order: number;
          type: LessonSectionType;
          title: string;
          content: string;
          mediaUrl?: string | null;
          metadata?: Prisma.InputJsonValue;
          required: boolean;
        };
        await prisma.lessonSection.upsert({
          where: {
            lessonId_order: {
              lessonId: lesson.id,
              order: secData.order,
            },
          },
          update: {
            type: secData.type,
            title: secData.title,
            content: secData.content,
            mediaUrl: secData.mediaUrl ?? null,
            metadata: secData.metadata ?? undefined,
            required: secData.required,
          },
          create: {
            lessonId: lesson.id,
            type: secData.type,
            title: secData.title,
            content: secData.content,
            mediaUrl: secData.mediaUrl ?? null,
            metadata: secData.metadata ?? undefined,
            required: secData.required,
            order: secData.order,
          },
        });
      }

      // Seed Quiz & Questions
      if (lesData.quiz) {
        const quiz = await prisma.quiz.upsert({
          where: { lessonId: lesson.id },
          update: {
            title: lesData.quiz.title,
            description: lesData.quiz.description,
            passingScore: 60,
            xpReward: 10,
          },
          create: {
            lessonId: lesson.id,
            title: lesData.quiz.title,
            description: lesData.quiz.description,
            passingScore: 60,
            xpReward: 10,
          },
        });

        for (const qData of lesData.quiz.questions) {
          const question = await prisma.question.upsert({
            where: {
              quizId_order: {
                quizId: quiz.id,
                order: qData.order,
              },
            },
            update: {
              type: qData.type,
              prompt: qData.prompt,
              explanation: qData.explanation,
            },
            create: {
              quizId: quiz.id,
              type: qData.type,
              prompt: qData.prompt,
              explanation: qData.explanation,
              order: qData.order,
            },
          });

          // Seed Answer Options
          for (const optData of qData.options) {
            const existingOpt = await prisma.answerOption.findFirst({
              where: {
                questionId: question.id,
                order: optData.order,
              },
            });

            if (existingOpt) {
              await prisma.answerOption.update({
                where: { id: existingOpt.id },
                data: {
                  text: optData.text,
                  isCorrect: optData.isCorrect,
                },
              });
            } else {
              await prisma.answerOption.create({
                data: {
                  questionId: question.id,
                  text: optData.text,
                  isCorrect: optData.isCorrect,
                  order: optData.order,
                },
              });
            }
          }
        }
      }

      totalLessonsSeeded++;
    }
  }

  console.log(`✓ Seeded ${modulesData.length} modules and ${totalLessonsSeeded} lessons with sections and quizzes.`);
  console.log('✨ Seeding complete and verified deterministic!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
