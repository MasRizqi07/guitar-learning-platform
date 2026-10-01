'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Send,
  Lock,
  Cpu,
  MessageSquare,
  UserCheck,
  UserX,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SupportTicketStatus, SupportTicketPriority, SupportCategory } from '@prisma/client';

interface Author {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface MessageItem {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author: Author;
}

interface InternalNoteItem {
  id: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  author: Author;
}

interface AdminTicketSummary {
  id: string;
  ticketNumber: string;
  subject: string;
  category: SupportCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedToId: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  _count: {
    messages: number;
    internalNotes: number;
  };
}

interface AdminTicketDetail extends AdminTicketSummary {
  telemetry?: {
    userAgent?: string;
    audioSampleRate?: number;
    audioContextState?: string;
    platform?: string;
    screenResolution?: string;
  };
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  messages: MessageItem[];
  internalNotes: InternalNoteItem[];
}

export default function AdminSupportInboxPage() {
  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketDetail, setTicketDetail] = useState<AdminTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterTag, setFilterTag] = useState<'ALL' | 'UNASSIGNED' | 'AUDIO_DSP' | 'HIGH_PRIORITY'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Reply composer state
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Current session user (for Assign to Self)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((d) => {
        if (d.data?.id) setCurrentUser({ id: d.data.id, name: d.data.name || d.data.email });
      })
      .catch(() => {});
  }, []);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadQueue() {
      try {
        const params = new URLSearchParams();
        if (filterTag === 'UNASSIGNED') params.set('assignedToId', 'UNASSIGNED');
        if (filterTag === 'AUDIO_DSP') params.set('category', 'AUDIO_DSP');
        if (filterTag === 'HIGH_PRIORITY') params.set('priority', 'HIGH');
        if (searchFilter.trim()) params.set('search', searchFilter.trim());

        const res = await fetch(`/api/admin/support?${params.toString()}`);
        const data = await res.json();
        if (!ignore && data.data?.tickets) {
          setTickets(data.data.tickets);
          if (data.data.tickets.length > 0 && !selectedTicketId) {
            setSelectedTicketId(data.data.tickets[0].id);
          } else if (data.data.tickets.length === 0) {
            setSelectedTicketId('');
            setTicketDetail(null);
          }
        }
      } catch (err) {
        console.error('Failed to load tickets', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadQueue();

    return () => {
      ignore = true;
    };
  }, [filterTag, searchFilter, selectedTicketId, refreshKey]);

  // Derived loading state: true when a ticket is selected but its full detail has not loaded yet
  const detailLoading = Boolean(selectedTicketId && (!ticketDetail || ticketDetail.id !== selectedTicketId));

  // Fetch ticket detail whenever selectedTicketId changes
  useEffect(() => {
    if (!selectedTicketId) return;

    let ignore = false;
    async function loadDetail() {
      try {
        setActionError(null);
        const res = await fetch(`/api/admin/support/${selectedTicketId}`);
        const data = await res.json();
        if (!ignore && data.data?.ticket) {
          setTicketDetail(data.data.ticket);
        }
      } catch (err) {
        console.error('Failed to load ticket detail', err);
      }
    }
    loadDetail();
    return () => {
      ignore = true;
    };
  }, [selectedTicketId]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !ticketDetail) return;

    try {
      setSubmittingReply(true);
      setActionSuccess(null);
      setActionError(null);

      const endpoint = isInternal
        ? `/api/admin/support/${ticketDetail.id}/note`
        : `/api/admin/support/${ticketDetail.id}/reply`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyText.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit response.');
      }

      setReplyText('');
      setActionSuccess(isInternal ? 'Internal staff note saved.' : 'Public reply sent to learner.');
      
      // Refresh detail and queue
      setRefreshKey((k) => k + 1);
      const detailRes = await fetch(`/api/admin/support/${ticketDetail.id}`);
      const detailData = await detailRes.json();
      if (detailData.data?.ticket) {
        setTicketDetail(detailData.data.ticket);
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error sending reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleAssign = async (staffId: string | null) => {
    if (!ticketDetail) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/admin/support/${ticketDetail.id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: staffId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to assign');
      setActionSuccess(staffId ? 'Ticket assigned to you.' : 'Ticket unassigned.');
      setRefreshKey((k) => k + 1);
      const detailRes = await fetch(`/api/admin/support/${ticketDetail.id}`);
      const detailData = await detailRes.json();
      if (detailData.data?.ticket) setTicketDetail(detailData.data.ticket);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error updating assignment');
    }
  };

  const handleStatusChange = async (newStatus: SupportTicketStatus) => {
    if (!ticketDetail) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/admin/support/${ticketDetail.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update status');
      setActionSuccess(`Ticket status updated to ${newStatus}.`);
      setRefreshKey((k) => k + 1);
      const detailRes = await fetch(`/api/admin/support/${ticketDetail.id}`);
      const detailData = await detailRes.json();
      if (detailData.data?.ticket) setTicketDetail(detailData.data.ticket);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  const handlePriorityChange = async (newPriority: SupportTicketPriority) => {
    if (!ticketDetail) return;
    try {
      setActionError(null);
      const res = await fetch(`/api/admin/support/${ticketDetail.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update priority');
      setActionSuccess(`Priority set to ${newPriority}.`);
      setRefreshKey((k) => k + 1);
      const detailRes = await fetch(`/api/admin/support/${ticketDetail.id}`);
      const detailData = await detailRes.json();
      if (detailData.data?.ticket) setTicketDetail(detailData.data.ticket);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error updating priority');
    }
  };

  const applyMacro = (macroText: string) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${macroText}` : macroText));
  };

  // Merge public messages and internal notes sorted chronologically for staff view
  const combinedHistory = [
    ...(ticketDetail?.messages.map((m) => ({ ...m, isInternal: false })) || []),
    ...(ticketDetail?.internalNotes.map((n) => ({ ...n, isInternal: true })) || []),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Staff Backoffice</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400 font-bold">Support Queue &amp; Operations</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight mt-1 flex items-center gap-3">
            <span>Student Support Ticket Desk</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE DATABASE DISPATCH
            </span>
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
          isLoading={loading}
          className="gap-2 border-[#2A303A]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </Button>
      </div>

      {/* Split-View Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[720px]">
        {/* LEFT COLUMN: Queue List (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-4 bg-[#171A20] border-[#2A303A] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase font-mono tracking-wider text-slate-300">
                Ticket Queue ({tickets.length})
              </span>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {tickets.filter((t) => t.status === 'OPEN').length} Open
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'UNASSIGNED', label: 'Unassigned' },
                  { id: 'AUDIO_DSP', label: 'Audio & DSP' },
                  { id: 'HIGH_PRIORITY', label: 'High Priority' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterTag(f.id)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors ${
                    filterTag === f.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-[#0E1014] text-slate-400 hover:text-slate-200 border border-[#2A303A]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by ticket number, user, or subject..."
                className="w-full h-9 pl-9 pr-3 bg-[#0E1014] border border-[#2A303A] rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </Card>

          {/* Ticket List */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {loading && tickets.length === 0 ? (
              <div className="py-12 text-center text-slate-500 font-mono text-xs">
                Scanning support queue...
              </div>
            ) : tickets.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-[#2A303A] rounded-xl">
                No tickets in this queue.
              </div>
            ) : (
              tickets.map((ticket) => {
                const isSelected = selectedTicketId === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => {
                      if (selectedTicketId !== ticket.id) {
                        setSelectedTicketId(ticket.id);
                      }
                    }}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-150 border relative ${
                      isSelected
                        ? 'bg-[#20242C] border-amber-500/50 shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                        : 'bg-[#171A20] border-[#2A303A] hover:bg-[#1A1E26]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-amber-500 rounded-r-full" />
                    )}

                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-amber-400">{ticket.ticketNumber}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            ticket.priority === 'URGENT'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : ticket.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {ticket.priority}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#0E1014] text-[10px] font-mono text-slate-300">
                          {ticket.category}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-100 line-clamp-1 mb-1">{ticket.subject}</h3>

                    <div className="flex items-center justify-between pt-1.5 border-t border-[#2A303A]/60 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[9px] font-bold">
                          {(ticket.user?.name || ticket.user?.email || 'U').charAt(0)}
                        </div>
                        <span className="text-slate-300 truncate max-w-[120px]">{ticket.user?.name || ticket.user?.email}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {ticket.assignedTo ? (
                          <span className="text-[10px] font-mono text-slate-400">
                            👤 {ticket.assignedTo.name || 'Staff'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-600">Unassigned</span>
                        )}
                        <span
                          className={`text-[10px] font-mono font-bold ${
                            ticket.status === 'RESOLVED'
                              ? 'text-emerald-400'
                              : ticket.status === 'IN_PROGRESS'
                              ? 'text-blue-400'
                              : ticket.status === 'WAITING_USER'
                              ? 'text-purple-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Ticket Conversation & Telemetry (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {detailLoading ? (
            <div className="py-24 text-center text-slate-500 font-mono text-xs">
              Loading ticket details...
            </div>
          ) : ticketDetail ? (
            <>
              {/* Ticket Controls & Metadata Card */}
              <Card className="p-5 bg-[#171A20] border-[#2A303A] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{ticketDetail.ticketNumber}</span>
                      <span className="text-xs font-bold text-slate-200">{ticketDetail.subject}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Learner: <strong className="text-slate-200">{ticketDetail.user?.name || 'Learner'}</strong> ({ticketDetail.user?.email})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        ticketDetail.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : ticketDetail.status === 'CLOSED'
                          ? 'bg-slate-800 text-slate-400'
                          : ticketDetail.status === 'WAITING_USER'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      ● {ticketDetail.status}
                    </span>
                  </div>
                </div>

                {/* Operations Toolbar */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#2A303A] text-xs">
                  {/* Assignment Control */}
                  <div className="flex items-center gap-1.5">
                    {ticketDetail.assignedToId === currentUser?.id ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(null)}
                        className="text-xs font-mono border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1 h-7"
                      >
                        <UserX className="w-3 h-3" />
                        <span>Unassign Self</span>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssign(currentUser?.id || null)}
                        disabled={!currentUser?.id}
                        className="text-xs font-mono border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 gap-1 h-7"
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>Assign to Me</span>
                      </Button>
                    )}
                  </div>

                  {/* Priority Select */}
                  <div className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={ticketDetail.priority}
                      onChange={(e) => handlePriorityChange(e.target.value as SupportTicketPriority)}
                      className="bg-[#0E1014] border border-[#2A303A] rounded px-2 py-1 text-[11px] font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                    >
                      <option value="LOW">Priority: LOW</option>
                      <option value="NORMAL">Priority: NORMAL</option>
                      <option value="HIGH">Priority: HIGH</option>
                      <option value="URGENT">Priority: URGENT</option>
                    </select>
                  </div>

                  {/* Status Actions */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {ticketDetail.status === 'OPEN' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('IN_PROGRESS')}
                        className="text-[11px] font-mono border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-7"
                      >
                        Start Investigation
                      </Button>
                    )}
                    {['OPEN', 'IN_PROGRESS'].includes(ticketDetail.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('WAITING_USER')}
                        className="text-[11px] font-mono border-purple-500/30 text-purple-400 hover:bg-purple-500/10 h-7"
                      >
                        Wait for Learner
                      </Button>
                    )}
                    {['OPEN', 'IN_PROGRESS', 'WAITING_USER'].includes(ticketDetail.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange('RESOLVED')}
                        className="text-[11px] font-mono border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 h-7"
                      >
                        Mark Resolved
                      </Button>
                    )}
                    {ticketDetail.status === 'RESOLVED' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange('OPEN')}
                          className="text-[11px] font-mono border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-7"
                        >
                          Reopen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange('CLOSED')}
                          className="text-[11px] font-mono border-slate-700 text-slate-400 hover:bg-slate-800 h-7"
                        >
                          Close Ticket
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Client Auto-Diagnostics Telemetry Pill */}
                {ticketDetail.telemetry && (
                  <div className="p-3 bg-[#0E1014] border border-[#2A303A] rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <Cpu className="w-3.5 h-3.5" /> Bounded Audio Diagnostics
                      </span>
                      <span className="text-slate-400">
                        DSP Sample Rate: {ticketDetail.telemetry.audioSampleRate || 48000} Hz
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                      <div>OS / Platform: {ticketDetail.telemetry.platform || 'Unknown'}</div>
                      <div>AudioContext State: {ticketDetail.telemetry.audioContextState || 'idle'}</div>
                      <div className="sm:col-span-2 truncate">
                        Browser Agent: {ticketDetail.telemetry.userAgent}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Message Thread History */}
              <Card className="p-5 bg-[#171A20] border-[#2A303A] space-y-4 flex-1 overflow-y-auto max-h-[380px]">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Conversation &amp; Internal Notes ({combinedHistory.length})</span>
                </h3>

                <div className="space-y-3">
                  {combinedHistory.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl text-xs space-y-1 ${
                        item.isInternal
                          ? 'bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-200'
                          : ['SUPPORT', 'ADMIN', 'OWNER'].includes(item.author?.role)
                          ? 'bg-[#20242C] border border-[#2A303A] text-slate-100 ml-4'
                          : 'bg-[#0E1014] border border-[#2A303A] text-slate-300 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold flex items-center gap-1">
                          {item.isInternal && <Lock className="w-3 h-3 text-amber-400" />}
                          {item.author?.name || item.author?.email || 'User'}{' '}
                          {item.isInternal ? '(Internal Staff Note)' : item.author?.role === 'LEARNER' ? '(Learner)' : '(Staff)'}
                        </span>
                        <span className="text-slate-500">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{item.body}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Response Composer */}
              <Card className="p-4 bg-[#171A20] border-[#2A303A] space-y-3">
                {/* Canned Macro Chips */}
                <div className="flex items-center gap-2 overflow-x-auto text-[11px] pb-1">
                  <span className="font-mono text-slate-500 shrink-0">Macros:</span>
                  <button
                    type="button"
                    onClick={() =>
                      applyMacro(
                        'Please tap the "Enable Microphone" button directly on the tuner screen to release the browser audio lock.'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#0E1014] border border-[#2A303A] text-slate-300 hover:text-amber-400 whitespace-nowrap"
                  >
                    + Mic Permission Prompt
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyMacro(
                        'Ensure you are using wired headphones or built-in speakers; Bluetooth audio adds ~200ms latency.'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#0E1014] border border-[#2A303A] text-slate-300 hover:text-amber-400 whitespace-nowrap"
                  >
                    + Bluetooth Latency Tip
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyMacro(
                        'This issue has been escalated to audio engineering and corrected in the current build.'
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#0E1014] border border-[#2A303A] text-slate-300 hover:text-amber-400 whitespace-nowrap"
                  >
                    + Issue Resolved Note
                  </button>
                </div>

                {actionSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{actionSuccess}</span>
                  </div>
                )}

                {actionError && (
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{actionError}</span>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsInternal(false)}
                        className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold ${
                          !isInternal ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Public Reply
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsInternal(true)}
                        className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold flex items-center gap-1 ${
                          isInternal ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Lock className="w-3 h-3" /> Internal Staff Note
                      </button>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">
                      {isInternal ? 'Only staff can read this' : 'Visible to learner + email notification'}
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isInternal
                        ? 'Add an internal note for staff members only...'
                        : 'Type your message to the student...'
                    }
                    className="w-full bg-[#0E1014] border border-[#2A303A] rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingReply || !replyText.trim()}
                      isLoading={submittingReply}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      <span>{isInternal ? 'Save Internal Note' : 'Send Student Reply'}</span>
                    </Button>
                  </div>
                </form>
              </Card>
            </>
          ) : (
            <div className="h-full flex items-center justify-center p-12 text-center border border-dashed border-[#2A303A] rounded-2xl text-slate-500 text-sm">
              Select a ticket from the queue to view full conversation and diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
