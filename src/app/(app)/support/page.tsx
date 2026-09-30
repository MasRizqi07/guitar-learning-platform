'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';

interface LearnerTicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

export default function LearnerSupportPage() {
  const [tickets, setTickets] = useState<LearnerTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let ignore = false;

    async function loadTickets() {
      try {
        const url = statusFilter !== 'ALL' ? `/api/support?status=${statusFilter}` : '/api/support';
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to fetch support tickets');
        }
        if (!ignore) {
          setTickets(data.data?.tickets || []);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching tickets');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTickets();

    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="primary">In Progress</Badge>;
      case 'WAITING_USER':
        return <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Action Needed</span>;
      case 'RESOLVED':
        return <Badge variant="success">Resolved</Badge>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-mono text-slate-400 bg-slate-800 border border-slate-700">Closed</span>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Support History &amp; Requests
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            Track inquiries, audio troubleshooting logs, and responses from FretFlow support staff.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/help">
            <Button variant="outline" size="sm" className="border-[#2A303A] text-slate-300">
              Help Center &amp; FAQ
            </Button>
          </Link>
          <Link href="/support/new">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5">
              <PlusCircle className="w-4 h-4" />
              <span>New Ticket</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#2A303A]">
        <Filter className="w-4 h-4 text-slate-500 mr-1 shrink-0" />
        {['ALL', 'OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'].map((st) => (
          <button
            key={st}
            onClick={() => {
              setLoading(true);
              setStatusFilter(st);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 ${
              statusFilter === st
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-[#171A20] text-slate-400 hover:text-slate-200 border border-[#2A303A]'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="py-16 text-center text-slate-500 font-mono text-sm">
          Loading support tickets...
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-12 text-center bg-[#171A20] border-[#2A303A] space-y-4">
          <LifeBuoy className="w-12 h-12 mx-auto text-slate-600" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No support tickets found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {statusFilter !== 'ALL'
                ? `You have no tickets matching filter "${statusFilter}".`
                : 'Need assistance with your audio setup, lesson progress, or account? Submit your first ticket.'}
            </p>
          </div>
          <Link href="/support/new">
            <Button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs mt-2">
              Create Support Ticket
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link key={ticket.id} href={`/support/${ticket.id}`} className="block group">
              <Card className="p-5 bg-[#171A20] border-[#2A303A] hover:border-amber-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {ticket.ticketNumber}
                    </span>
                    {getStatusBadge(ticket.status)}
                    <span className="text-xs font-mono text-slate-500 uppercase">
                      {ticket.category.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                    {ticket.subject}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Created {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {ticket._count.messages} message{ticket._count.messages === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 group-hover:text-amber-400 self-end sm:self-center transition-colors text-xs font-mono">
                  <span>View Details</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
