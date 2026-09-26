'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
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

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    pageSize: 20,
  });

  // Inspection Modal
  const [activeLog, setActiveLog] = useState<AuditItem | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pagination.pageSize.toString(),
        });

        if (actionFilter) params.set('action', actionFilter);
        if (entityTypeFilter) params.set('entityType', entityTypeFilter);

        const res = await fetch(`/api/admin/audit?${params.toString()}`);
        const json = await res.json();

        if (ignore) return;

        if (!res.ok) {
          throw new Error(json.error?.message || 'Failed to fetch audit records');
        }

        setLogs(json.data?.items || []);
        setPagination(json.data?.pagination || { total: 0, totalPages: 1, pageSize: 20 });
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Error fetching audit logs');
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
  }, [page, pagination.pageSize, actionFilter, entityTypeFilter, refreshIndex]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            <span>Privileged Audit Log</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable system audit records tracking all administrative mutations across users and permissions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          isLoading={loading}
          className="self-start sm:self-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 bg-[#121620] border-[#222938]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              Filter by Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0D1017] border border-[#262F40] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Actions</option>
              <option value="USER_SUSPENDED">USER_SUSPENDED</option>
              <option value="USER_UNSUSPENDED">USER_UNSUSPENDED</option>
              <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
              <option value="USER_BANNED">USER_BANNED</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
              Filter by Entity
            </label>
            <select
              value={entityTypeFilter}
              onChange={(e) => {
                setEntityTypeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-[#0D1017] border border-[#262F40] text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Entity Types</option>
              <option value="User">User</option>
              <option value="Course">Course</option>
              <option value="Lesson">Lesson</option>
            </select>
          </div>

          <div className="flex items-end justify-end">
            <span className="text-xs text-slate-400 pb-2">
              Total Recorded Events: <strong className="text-slate-200">{pagination.total}</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-[#222938] bg-[#121620] overflow-hidden">
        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-600" />
            <span>Loading audit log records...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-slate-600" />
            <p className="font-semibold text-slate-300">No audit records found</p>
            <p className="text-slate-500 mt-1">No actions match your current filter query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0E121A] text-slate-400 font-bold border-b border-[#222938] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">IP Hash</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2636]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{log.actor.name}</p>
                      <span className="text-[10px] text-slate-500">{log.actor.role}</span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="text-slate-400">{log.entityType}</span>:{' '}
                      <span className="font-mono text-[10px] text-slate-500">
                        {log.entityId.slice(0, 8)}...
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[10px]">
                      {log.ipHash ? log.ipHash.slice(0, 10) : '—'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveLog(log)}
                        className="gap-1 text-[11px] py-1 h-7"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-[#0E121A] border-t border-[#222938] flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Page <strong>{page}</strong> of <strong>{pagination.totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages || loading}
                className="gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Details Inspection Modal */}
      {activeLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-xl w-full p-6 bg-[#141822] border-slate-700 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#222938]">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span className="text-amber-400">{activeLog.action}</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Logged on {new Date(activeLog.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-300 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Actor</span>
                  <strong>{activeLog.actor.name}</strong> ({activeLog.actor.email})
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Actor Role</span>
                  <strong>{activeLog.actor.role}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Target Entity</span>
                  <strong>{activeLog.entityType}</strong> ({activeLog.entityId})
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">User Agent</span>
                  <span className="truncate block">{activeLog.userAgent || 'Unknown'}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1">State Before:</span>
                <pre className="p-3 rounded-lg bg-[#0B0E14] border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto">
                  {activeLog.before ? JSON.stringify(activeLog.before, null, 2) : 'null'}
                </pre>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1">State After:</span>
                <pre className="p-3 rounded-lg bg-[#0B0E14] border border-slate-800 text-[11px] text-emerald-400 font-mono overflow-x-auto">
                  {activeLog.after ? JSON.stringify(activeLog.after, null, 2) : 'null'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={() => setActiveLog(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
