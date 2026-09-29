'use client';

import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface AuditItem {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function OwnerAuditPage() {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditItem | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: '15',
        });
        if (actionFilter) params.append('action', actionFilter.trim());
        if (entityFilter) params.append('entityType', entityFilter.trim());

        const res = await fetch(`/api/owner/audit?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to load audit logs: ${res.statusText}`);
        }
        const json = await res.json();
        if (ignore) return;
        if (json.success) {
          setItems(json.data.items);
          setPage(json.data.pagination.page);
          setTotalPages(json.data.pagination.totalPages);
          setTotalItems(json.data.pagination.total);
          setError(null);
        } else {
          throw new Error(json.error?.message || 'Error loading audit logs');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error loading audit logs');
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
  }, [page, actionFilter, entityFilter]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '15',
      });
      if (actionFilter) params.append('action', actionFilter.trim());
      if (entityFilter) params.append('entityType', entityFilter.trim());

      const res = await fetch(`/api/owner/audit?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setPage(json.data.pagination.page);
        setTotalPages(json.data.pagination.totalPages);
        setTotalItems(json.data.pagination.total);
        setError(null);
      } else {
        throw new Error(json.error?.message || 'Error loading audit logs');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    handleRefresh();
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <span>Privileged Platform Audit</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Immutable Log
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Authoritative chronological record of administrative actions, governance toggles, and feature flag changes.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 self-start sm:self-auto"
          title="Refresh Logs"
          aria-label="Refresh Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Filter Bar */}
      <form onSubmit={handleApplyFilter} className="p-4 rounded-xl bg-[#0D121F] border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Filter by Action (e.g. FEATURE_FLAG_UPDATED)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Filter by Entity (e.g. FeatureFlag, PlatformSetting)"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
        >
          Apply Filter
        </button>
      </form>

      {/* Audit Log Table */}
      <div className="p-6 rounded-2xl bg-[#0D121F] border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Privileged Audit Records ({totalItems})</h2>
          <div className="text-xs text-slate-400">
            Page {page} of {Math.max(totalPages, 1)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity Type / ID</th>
                <th className="py-2.5 px-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {items.length > 0 ? (
                items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-2.5 px-3 text-white font-sans font-medium">
                      <div>{log.actor.name}</div>
                      <div className="text-[10px] text-amber-400 font-mono">{log.actor.email}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 text-[11px] font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <span className="text-slate-400">{log.entityType}:</span>{' '}
                      <span className="text-white">{log.entityId.slice(0, 18)}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedEntry(log)}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Diff</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No privileged audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-xs text-slate-400 font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 disabled:opacity-40 flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Diff / Detail Modal */}
      {selectedEntry ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full p-6 rounded-2xl bg-[#0D121F] border border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Audit State Payload</h3>
                <div className="text-xs font-mono text-amber-400">{selectedEntry.action}</div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">State Before:</div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {selectedEntry.before
                    ? JSON.stringify(selectedEntry.before, null, 2)
                    : '(none)'}
                </pre>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">State After:</div>
                <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto">
                  {selectedEntry.after
                    ? JSON.stringify(selectedEntry.after, null, 2)
                    : '(none)'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
