'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  Send,
  Lock,
  Cpu,
  MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SupportTicket } from '@/services/support.service';

export default function AdminSupportInboxPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('T-104');
  const [filterTag, setFilterTag] = useState<'ALL' | 'UNASSIGNED' | 'AUDIO_DSP' | 'HIGH_PRIORITY'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  // Reply composer state
  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  const fetchTickets = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/support');
      const data = await res.json();
      if (data.data?.tickets) {
        setTickets(data.data.tickets);
        if (!data.data.tickets.some((t: SupportTicket) => t.id === selectedTicketId) && data.data.tickets.length > 0) {
          setSelectedTicketId(data.data.tickets[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load tickets', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/support');
        const data = await res.json();
        if (!ignore && data.data?.tickets) {
          setTickets(data.data.tickets);
        }
      } catch (err) {
        console.error('Failed to load tickets', err);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);


  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      setSubmittingReply(true);
      setReplySuccess(null);

      const res = await fetch(`/api/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyText,
          isInternal,
          senderName: 'Marcus Vance (Staff)',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to post reply.');
      }

      setReplyText('');
      setReplySuccess(isInternal ? 'Internal staff note added.' : 'Public reply sent to student.');
      await fetchTickets();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error sending reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const applyMacro = (macroText: string) => {
    setReplyText((prev) => (prev ? `${prev}\n\n${macroText}` : macroText));
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ticket.studentName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTag === 'UNASSIGNED') return !ticket.assignedStaff;
    if (filterTag === 'AUDIO_DSP') return ticket.category === 'AUDIO_DSP';
    if (filterTag === 'HIGH_PRIORITY') return ticket.priority === 'HIGH' || ticket.priority === 'URGENT';
    return true;
  });

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-400">
            <span>Staff Backoffice</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-400 font-bold">Support Queue &amp; Diagnostics</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight mt-1 flex items-center gap-3">
            <span>Student Support Ticket Desk</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              LIVE DISPATCH
            </span>
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchTickets(true)}
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
                Ticket Queue ({filteredTickets.length})
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
                placeholder="Filter by ticket ID, user, or topic..."
                className="w-full h-9 pl-9 pr-3 bg-[#0E1014] border border-[#2A303A] rounded-lg text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </Card>

          {/* Ticket List */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
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
                      <span className="font-mono text-xs font-bold text-amber-400">{ticket.id}</span>
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

                  <h3 className="text-xs font-bold text-slate-100 line-clamp-1 mb-1">{ticket.title}</h3>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                    {ticket.description}
                  </p>

                  <div className="flex items-center justify-between pt-1.5 border-t border-[#2A303A]/60 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[9px] font-bold">
                        {ticket.studentName.charAt(0)}
                      </div>
                      <span className="text-slate-300 truncate max-w-[120px]">{ticket.studentName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({ticket.experienceLevel})</span>
                    </div>

                    <span
                      className={`text-[10px] font-mono ${
                        ticket.status === 'RESOLVED'
                          ? 'text-emerald-400'
                          : ticket.status === 'IN_PROGRESS'
                          ? 'text-blue-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Ticket Conversation & Telemetry (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {selectedTicket ? (
            <>
              {/* Ticket Header & Diagnostics Card */}
              <Card className="p-5 bg-[#171A20] border-[#2A303A] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">{selectedTicket.id}</span>
                      <span className="text-xs font-bold text-slate-200">{selectedTicket.title}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted by <strong className="text-slate-200">{selectedTicket.studentName}</strong> ({selectedTicket.studentEmail})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                        selectedTicket.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      ● {selectedTicket.status}
                    </span>
                  </div>
                </div>

                {/* Client Auto-Diagnostics Telemetry Pill */}
                {selectedTicket.telemetry && (
                  <div className="p-3 bg-[#0E1014] border border-[#2A303A] rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                        <Cpu className="w-3.5 h-3.5" /> Client Audio Diagnostics Verified
                      </span>
                      <span className="text-slate-400">
                        DSP Sample Rate: {selectedTicket.telemetry.audioSampleRate || 48000} Hz
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                      <div>OS / Platform: {selectedTicket.telemetry.platform || 'Unknown'}</div>
                      <div>AudioContext State: {selectedTicket.telemetry.audioContextState || 'active'}</div>
                      <div className="sm:col-span-2 truncate">
                        Browser Agent: {selectedTicket.telemetry.userAgent}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Message Thread History */}
              <Card className="p-5 bg-[#171A20] border-[#2A303A] space-y-4 flex-1 overflow-y-auto max-h-[380px]">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Conversation History</span>
                </h3>

                <div className="space-y-3">
                  {selectedTicket.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl text-xs space-y-1 ${
                        msg.isInternal
                          ? 'bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-200'
                          : msg.senderRole === 'STAFF'
                          ? 'bg-[#20242C] border border-[#2A303A] text-slate-100 ml-4'
                          : 'bg-[#0E1014] border border-[#2A303A] text-slate-300 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="font-bold flex items-center gap-1">
                          {msg.isInternal && <Lock className="w-3 h-3 text-amber-400" />}
                          {msg.senderName} {msg.isInternal && '(Internal Staff Note)'}
                        </span>
                        <span className="text-slate-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="leading-relaxed">{msg.content}</p>
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

                {replySuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{replySuccess}</span>
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
                        <Lock className="w-3 h-3" /> Internal Note
                      </button>
                    </div>
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
                    className="w-full bg-[#0E1014] border border-[#2A303A] rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-500 resize-none"
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
