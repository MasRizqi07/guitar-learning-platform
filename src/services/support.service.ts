export interface DiagnosticTelemetry {
  userAgent: string;
  audioSampleRate?: number;
  audioContextState?: string;
  platform?: string;
  screenResolution?: string;
}

export interface TicketMessage {
  id: string;
  senderName: string;
  senderRole: 'STUDENT' | 'STAFF' | 'SYSTEM';
  content: string;
  isInternal: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  studentName: string;
  studentEmail: string;
  experienceLevel: string;
  category: 'AUDIO_DSP' | 'CURRICULUM' | 'ACCOUNT' | 'CONTENT_BUG' | 'GENERAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  title: string;
  description: string;
  assignedStaff: string | null;
  telemetry?: DiagnosticTelemetry;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

// In-memory support store seeded with real tickets from design
class SupportStore {
  private static instance: SupportStore;
  private tickets: SupportTicket[] = [
    {
      id: 'T-104',
      studentName: 'Adi Pratama',
      studentEmail: 'adi.pratama@example.com',
      experienceLevel: 'Beginner',
      category: 'AUDIO_DSP',
      priority: 'URGENT',
      status: 'OPEN',
      title: 'Microphone pitch frozen on Chrome iOS',
      description: "Tuner needle gets stuck at 82Hz Low E and doesn't respond to D string when plucking repeatedly. Audio permissions are allowed.",
      assignedStaff: 'Marcus Vance',
      telemetry: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
        audioSampleRate: 44100,
        audioContextState: 'suspended',
        platform: 'iOS WebKit',
        screenResolution: '393x852',
      },
      createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      messages: [
        {
          id: 'm-1',
          senderName: 'Adi Pratama',
          senderRole: 'STUDENT',
          content: "Tuner needle gets stuck at 82Hz Low E and doesn't respond to D string when plucking repeatedly. Audio permissions are allowed.",
          isInternal: false,
          createdAt: new Date(Date.now() - 14 * 60 * 1000).toISOString(),
        },
        {
          id: 'm-2',
          senderName: 'Marcus Vance',
          senderRole: 'STAFF',
          content: 'iOS WebKit suspends audio context until an explicit user touch occurs on the canvas. I will advise reloading the tuner button.',
          isInternal: true,
          createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: 'T-103',
      studentName: 'Maya Indah',
      studentEmail: 'maya.indah@example.com',
      experienceLevel: 'Intermediate',
      category: 'CURRICULUM',
      priority: 'MEDIUM',
      status: 'OPEN',
      title: 'Lesson 3 Section 4 Practice Drill not registering 60s completion',
      description: 'Completed the speed drill twice at 90 BPM with 0 errors but the continue button remains disabled.',
      assignedStaff: null,
      telemetry: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36',
        audioSampleRate: 48000,
        audioContextState: 'running',
        platform: 'macOS',
        screenResolution: '1920x1080',
      },
      createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      messages: [
        {
          id: 'm-3',
          senderName: 'Maya Indah',
          senderRole: 'STUDENT',
          content: 'Completed the speed drill twice at 90 BPM with 0 errors but the continue button remains disabled.',
          isInternal: false,
          createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: 'T-102',
      studentName: 'Budi Santoso',
      studentEmail: 'budi.santoso@example.com',
      experienceLevel: 'Basic Player',
      category: 'ACCOUNT',
      priority: 'LOW',
      status: 'IN_PROGRESS',
      title: 'Forgot 2FA backup codes after switching to new device',
      description: 'Lost Google Authenticator seed while migrating phone. Requesting identity verification bypass.',
      assignedStaff: 'Alex Mercer',
      telemetry: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/128.0.0.0',
        audioSampleRate: 48000,
        audioContextState: 'running',
        platform: 'Windows',
        screenResolution: '2560x1440',
      },
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      messages: [
        {
          id: 'm-4',
          senderName: 'Budi Santoso',
          senderRole: 'STUDENT',
          content: 'Lost Google Authenticator seed while migrating phone. Requesting identity verification bypass.',
          isInternal: false,
          createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        },
      ],
    },
    {
      id: 'T-101',
      studentName: 'Rian Putra',
      studentEmail: 'rian.putra@example.com',
      experienceLevel: 'Beginner',
      category: 'CONTENT_BUG',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      title: 'Chord diagram for B7 shows finger 4 on wrong fret',
      description: 'The fret matrix highlights fret 3 instead of fret 2 on high E string. Confuses beginners.',
      assignedStaff: 'Marcus Vance',
      telemetry: {
        userAgent: 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) Firefox/129.0',
        audioSampleRate: 44100,
        audioContextState: 'running',
        platform: 'Linux',
        screenResolution: '1920x1080',
      },
      createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      messages: [
        {
          id: 'm-5',
          senderName: 'Rian Putra',
          senderRole: 'STUDENT',
          content: 'The fret matrix highlights fret 3 instead of fret 2 on high E string. Confuses beginners.',
          isInternal: false,
          createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        },
        {
          id: 'm-6',
          senderName: 'Marcus Vance',
          senderRole: 'STAFF',
          content: 'Confirmed diagram coordinates updated in CMS chord vault. Marked resolved.',
          isInternal: false,
          createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
      ],
    },
  ];

  static getInstance(): SupportStore {
    if (!SupportStore.instance) {
      SupportStore.instance = new SupportStore();
    }
    return SupportStore.instance;
  }

  getAll(): SupportTicket[] {
    return [...this.tickets];
  }

  getById(id: string): SupportTicket | undefined {
    return this.tickets.find((t) => t.id === id);
  }

  create(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>): SupportTicket {
    const nextNum = 100 + this.tickets.length + 1;
    const newTicket: SupportTicket = {
      ...ticket,
      id: `T-${nextNum}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `m-${Date.now()}`,
          senderName: ticket.studentName,
          senderRole: 'STUDENT',
          content: ticket.description,
          isInternal: false,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    this.tickets.unshift(newTicket);
    return newTicket;
  }

  addMessage(
    ticketId: string,
    message: { senderName: string; senderRole: 'STUDENT' | 'STAFF' | 'SYSTEM'; content: string; isInternal: boolean }
  ): SupportTicket | undefined {
    const ticket = this.getById(ticketId);
    if (!ticket) return undefined;

    ticket.messages.push({
      id: `m-${Date.now()}`,
      senderName: message.senderName,
      senderRole: message.senderRole,
      content: message.content,
      isInternal: message.isInternal,
      createdAt: new Date().toISOString(),
    });

    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }

  updateStatus(ticketId: string, status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'): SupportTicket | undefined {
    const ticket = this.getById(ticketId);
    if (!ticket) return undefined;
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    return ticket;
  }
}

export const supportService = SupportStore.getInstance();
