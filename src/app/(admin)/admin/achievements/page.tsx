'use client';

import React, { useEffect, useState } from 'react';
import {
  Award,
  Plus,
  Search,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';

interface AchievementItem {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  conditionType: string;
  conditionValue: number;
  xpReward: number;
  active: boolean;
  _count: { userAchievements: number };
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New Achievement state
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('🏆');
  const [conditionType, setConditionType] = useState('LESSONS_COMPLETED');
  const [conditionValue, setConditionValue] = useState(1);
  const [xpReward, setXpReward] = useState(50);
  const [active] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // Edit Achievement state
  const [editingAch, setEditingAch] = useState<AchievementItem | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const url = search.trim()
          ? `/api/admin/achievements?search=${encodeURIComponent(search.trim())}`
          : '/api/admin/achievements';
        const res = await fetch(url);
        const data = await res.json();
        if (ignore) return;
        if (!res.ok) {
          throw new Error(data.error?.message || 'Failed to load achievements');
        }
        setAchievements(data.data);
        setError(null);
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load achievements');
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
  }, [search, refreshIndex]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch('/api/admin/achievements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          name,
          description,
          icon,
          conditionType,
          conditionValue: Number(conditionValue),
          xpReward: Number(xpReward),
          active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create achievement');

      setShowCreate(false);
      setCode('');
      setName('');
      setDescription('');
      setSuccess('Achievement created successfully.');
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create achievement');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAch) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const res = await fetch(`/api/admin/achievements/${editingAch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingAch.name,
          description: editingAch.description,
          icon: editingAch.icon,
          conditionType: editingAch.conditionType,
          conditionValue: Number(editingAch.conditionValue),
          xpReward: Number(editingAch.xpReward),
          active: editingAch.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update achievement');

      setEditingAch(null);
      setSuccess('Achievement updated successfully.');
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update achievement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Achievements CMS</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Milestones and badges earned by learners. Stable codes are protected to ensure historical learner unlocks remain valid.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setLoading(true);
              setRefreshIndex((r) => r + 1);
            }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {showCreate ? 'Close Form' : 'New Achievement'}
          </button>
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

      {/* Quick Create Drawer */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-5 rounded-xl bg-[#12161F] border border-amber-500/30 space-y-4">
          <h2 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Create Achievement Badge
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Stable Code (Uppercase, Immutable)
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                placeholder="e.g. STREAK_30"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs font-mono text-amber-400 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly Legend"
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Icon / Emoji</label>
              <input
                type="text"
                required
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500 text-center text-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Condition Type</label>
              <select
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="LESSONS_COMPLETED">LESSONS_COMPLETED</option>
                <option value="PRACTICE_SECONDS">PRACTICE_SECONDS</option>
                <option value="CURRENT_STREAK">CURRENT_STREAK</option>
                <option value="QUIZZES_COMPLETED">QUIZZES_COMPLETED</option>
                <option value="PERFECT_QUIZZES">PERFECT_QUIZZES</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Threshold Target Value
              </label>
              <input
                type="number"
                min={1}
                required
                value={conditionValue}
                onChange={(e) => setConditionValue(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">XP Reward</label>
              <input
                type="number"
                min={5}
                max={1000}
                required
                value={xpReward}
                onChange={(e) => setXpReward(parseInt(e.target.value, 10))}
                className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Maintain a 30-day practice streak without missing a day."
              className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
            >
              {saving ? 'Creating...' : 'Create Achievement'}
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="p-4 rounded-xl bg-[#12161F] border border-[#1F2636] flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search achievements..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Achievements Table */}
      <div className="rounded-xl bg-[#12161F] border border-[#1F2636] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0D111A] text-slate-400 text-[11px] font-semibold border-b border-[#1F2636]">
              <tr>
                <th className="px-4 py-3">Icon</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name & Description</th>
                <th className="px-4 py-3">Condition & Value</th>
                <th className="px-4 py-3">XP Reward</th>
                <th className="px-4 py-3">Learners Earned</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2636]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading achievements...
                  </td>
                </tr>
              ) : achievements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    No achievements found.
                  </td>
                </tr>
              ) : (
                achievements.map((ach) => (
                  <tr key={ach.id} className="hover:bg-[#151b26] transition">
                    <td className="px-4 py-3 text-2xl">{ach.icon}</td>
                    <td className="px-4 py-3 font-mono font-bold text-amber-400">{ach.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-100">{ach.name}</div>
                      <div className="text-[11px] text-slate-500">{ach.description}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className="font-mono text-[10px] text-indigo-400">
                        {ach.conditionType}
                      </span>
                      <span className="ml-1.5 font-bold text-slate-200">({ach.conditionValue})</span>
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-semibold">+{ach.xpReward} XP</td>
                    <td className="px-4 py-3 text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        {ach._count.userAchievements} learners
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          ach.active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {ach.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingAch(ach)}
                        className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-amber-400 hover:bg-slate-700 font-semibold"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Achievement Modal */}
      {editingAch && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#12161F] border border-[#222938] rounded-xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Edit Achievement: {editingAch.code}</span>
              </h3>
              <button onClick={() => setEditingAch(null)} className="p-1 rounded text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Badge Name</label>
                  <input
                    type="text"
                    required
                    value={editingAch.name}
                    onChange={(e) => setEditingAch({ ...editingAch, name: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Icon / Emoji</label>
                  <input
                    type="text"
                    required
                    value={editingAch.icon}
                    onChange={(e) => setEditingAch({ ...editingAch, icon: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500 text-center text-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={editingAch.description}
                  onChange={(e) => setEditingAch({ ...editingAch, description: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Condition Type</label>
                  <select
                    value={editingAch.conditionType}
                    onChange={(e) => setEditingAch({ ...editingAch, conditionType: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="LESSONS_COMPLETED">LESSONS_COMPLETED</option>
                    <option value="PRACTICE_SECONDS">PRACTICE_SECONDS</option>
                    <option value="CURRENT_STREAK">CURRENT_STREAK</option>
                    <option value="QUIZZES_COMPLETED">QUIZZES_COMPLETED</option>
                    <option value="PERFECT_QUIZZES">PERFECT_QUIZZES</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Value</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingAch.conditionValue}
                    onChange={(e) => setEditingAch({ ...editingAch, conditionValue: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">XP Reward</label>
                  <input
                    type="number"
                    min={5}
                    max={1000}
                    required
                    value={editingAch.xpReward}
                    onChange={(e) => setEditingAch({ ...editingAch, xpReward: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222938] text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="achActive"
                  checked={editingAch.active}
                  onChange={(e) => setEditingAch({ ...editingAch, active: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="achActive" className="text-xs text-slate-300 select-none">
                  Active (Learners can unlock this achievement)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#1F2636]">
                <button
                  type="button"
                  onClick={() => setEditingAch(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
