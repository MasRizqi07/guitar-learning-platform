'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  History,
  X,
} from 'lucide-react';

interface LessonSnapshot {
  lesson?: {
    title: string;
    description: string;
    difficulty: string;
    xpReward: number;
  };
  sections?: Array<{
    order: number;
    title: string;
    type: string;
    content: string;
  }>;
  quiz?: {
    title: string;
    questions?: Array<{
      prompt: string;
    }>;
  } | null;
}

interface RevisionItem {
  id: string;
  version: number;
  createdAt: string;
  publishedAt: string | null;
  createdBy: { name: string; email: string } | null;
  snapshot: LessonSnapshot;
}

export default function LessonRevisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [selectedRevision, setSelectedRevision] = useState<RevisionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/lessons/${id}/revisions`);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to fetch revisions');
        }
        setRevisions(data.data);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to fetch revisions');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [id, refreshIndex]);

  const handleRestore = async (revisionId: string, version: number) => {
    if (
      !confirm(
        `Are you sure you want to restore Version ${version}? This will create a safety snapshot of the current state and return the lesson to DRAFT status.`
      )
    ) {
      return;
    }

    try {
      setRestoring(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/lessons/${id}/revisions/${revisionId}/restore`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to restore revision');
      }

      setSuccess(`Version ${version} restored successfully as DRAFT.`);
      setRefreshIndex((r) => r + 1);
      setSelectedRevision(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to restore revision');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-5 border-b border-[#222938]">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/lessons/${id}`}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              <span>Lesson Revision History</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Monotonically versioned snapshots created on every publish. Restores return lesson to DRAFT with safety backups.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {success}
        </div>
      )}

      {/* Revision Table */}
      <div className="rounded-xl bg-[#12161F] border border-[#1F2636] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0D111A] text-slate-400 text-[11px] font-semibold border-b border-[#1F2636]">
              <tr>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3">Published At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2636]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading revisions...
                  </td>
                </tr>
              ) : revisions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No revisions recorded yet. Revisions are created automatically when lessons are published.
                  </td>
                </tr>
              ) : (
                revisions.map((rev) => (
                  <tr key={rev.id} className="hover:bg-[#151b26] transition">
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">
                      v{rev.version}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {rev.createdBy?.name || rev.createdBy?.email || 'System'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(rev.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {rev.publishedAt ? new Date(rev.publishedAt).toLocaleString() : 'Backup Snapshot'}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => setSelectedRevision(rev)}
                        className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-300 hover:text-white font-medium"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => handleRestore(rev.id, rev.version)}
                        disabled={restoring}
                        className="px-2.5 py-1 text-[11px] rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Snapshot Modal */}
      {selectedRevision && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#12161F] border border-[#222938] rounded-xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span>Inspection: Version {selectedRevision.version}</span>
              </h3>
              <button
                onClick={() => setSelectedRevision(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-[#0C0F16] border border-[#1F2636] space-y-1">
                <div className="font-semibold text-slate-200">
                  {selectedRevision.snapshot?.lesson?.title}
                </div>
                <div className="text-slate-400">
                  {selectedRevision.snapshot?.lesson?.description}
                </div>
                <div className="text-slate-500 text-[10px]">
                  Difficulty: {selectedRevision.snapshot?.lesson?.difficulty} • Reward: +{selectedRevision.snapshot?.lesson?.xpReward} XP
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-300 mb-2">
                  Sections ({selectedRevision.snapshot?.sections?.length || 0}):
                </h4>
                <div className="space-y-2">
                  {selectedRevision.snapshot?.sections?.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-[#0C0F16] border border-[#1F2636]">
                      <div className="font-semibold text-slate-200 flex items-center gap-2">
                        <span>#{s.order}</span>
                        <span>{s.title}</span>
                        <span className="text-[10px] text-amber-400 uppercase">[{s.type}]</span>
                      </div>
                      <div className="text-slate-400 text-[11px] mt-1 line-clamp-2">{s.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#1F2636] flex justify-end gap-2">
              <button
                onClick={() => setSelectedRevision(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => handleRestore(selectedRevision.id, selectedRevision.version)}
                disabled={restoring}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400"
              >
                Restore This Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
