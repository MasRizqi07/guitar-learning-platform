'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  User,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';

interface Author {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface Message {
  id: string;
  ticketId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author: Author;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  userId: string;
  subject: string;
  category: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  messages: Message[];
}

export default function LearnerTicketDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadTicket() {
      try {
        const res = await fetch(`/api/support/${id}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load support ticket');
        }
        if (!ignore) {
          setTicket(data.data?.ticket || null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching ticket');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadTicket();

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSubmittingReply(true);
      setReplyError(null);

      const res = await fetch(`/api/support/${id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to send reply');
      }

      setReplyText('');
      const refreshRes = await fetch(`/api/support/${id}`);
      const refreshData = await refreshRes.json();
      if (refreshData.data?.ticket) {
        setTicket(refreshData.data.ticket);
      }
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Error sending reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const getStatusBadge = (status: SupportTicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="warning">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="primary">In Progress</Badge>;
      case 'WAITING_USER':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Action Required</span>;
      case 'RESOLVED':
        return <Badge variant="success">Resolved</Badge>;
      case 'CLOSED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-400 bg-slate-800 border border-slate-700">Closed</span>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center text-slate-500 font-mono text-sm">
        Loading ticket conversation...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-12 space-y-4">
        <Link
          href="/support"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-400"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Support</span>
        </Link>
        <Card className="p-8 bg-[#171A20] border-red-500/30 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-100">Ticket Not Available</h2>
          <p className="text-xs text-slate-400">{error || 'Ticket could not be found or access is denied.'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <Link
        href="/support"
        className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Support History</span>
      </Link>

      {/* Ticket Header Card */}
      <Card className="p-6 bg-[#171A20] border-[#2A303A] shadow-md space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
              {ticket.ticketNumber}
            </span>
            {getStatusBadge(ticket.status)}
            <span className="text-xs font-mono text-slate-400 uppercase bg-[#0E1014] px-2 py-1 rounded border border-[#2A303A]">
              {ticket.category.replace('_', ' ')}
            </span>
          </div>

          <div className="text-xs font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Opened {new Date(ticket.createdAt).toLocaleString()}</span>
          </div>
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
          {ticket.subject}
        </h1>

        {ticket.status === 'WAITING_USER' && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Staff is awaiting your reply or clarification to proceed.</span>
          </div>
        )}

        {ticket.status === 'RESOLVED' && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>This ticket was resolved on {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString() : 'recently'}. Replying below will reopen the ticket.</span>
          </div>
        )}
      </Card>

      {/* Message Thread */}
      <div className="space-y-4">
        <h2 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <span>Conversation History ({ticket.messages.length})</span>
        </h2>

        <div className="space-y-4">
          {ticket.messages.map((msg) => {
            const isStaff = ['SUPPORT', 'ADMIN', 'OWNER'].includes(msg.author.role);
            return (
              <Card
                key={msg.id}
                className={`p-5 space-y-3 ${
                  isStaff
                    ? 'bg-[#151922] border-amber-500/30 shadow-md'
                    : 'bg-[#171A20] border-[#2A303A]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {isStaff ? (
                      <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                        <ShieldCheck className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                        <User className="w-4 h-4" />
                      </span>
                    )}

                    <div>
                      <span className="font-semibold text-slate-200">
                        {msg.author.name || msg.author.email}
                      </span>
                      {isStaff ? (
                        <span className="ml-2 font-mono text-[10px] text-amber-400 uppercase font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Staff Support
                        </span>
                      ) : (
                        <span className="ml-2 font-mono text-[10px] text-slate-500 uppercase">
                          Learner
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(msg.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed pl-9">
                  {msg.body}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Reply Box */}
      {ticket.status === 'CLOSED' ? (
        <Card className="p-6 bg-[#171A20] border-[#2A303A] text-center text-xs text-slate-400 font-mono">
          This ticket has been permanently closed. If you require further assistance, please open a new support request.
        </Card>
      ) : (
        <Card className="p-6 bg-[#171A20] border-[#2A303A] shadow-md space-y-4">
          <h3 className="text-sm font-bold text-slate-200">
            {ticket.status === 'RESOLVED' ? 'Reopen with Reply' : 'Send Reply'}
          </h3>

          {replyError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{replyError}</span>
            </div>
          )}

          <form onSubmit={handleSendReply} className="space-y-3">
            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your response here..."
              required
              className="w-full bg-[#0E1014] border border-[#2A303A] rounded-lg p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 transition-colors leading-relaxed"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-500">
                Staff notifications are dispatched immediately.
              </span>

              <Button
                type="submit"
                disabled={submittingReply || !replyText.trim()}
                isLoading={submittingReply}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-2 text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reply</span>
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
