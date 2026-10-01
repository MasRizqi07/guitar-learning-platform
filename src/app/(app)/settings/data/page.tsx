'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Download,
  Trash2,
  ShieldAlert,
  FileText,
  Lock,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function DataPrivacySettingsPage() {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadData = async () => {
    try {
      setDownloading(true);
      setError(null);
      // Trigger file download via anchor element
      const link = document.createElement('a');
      link.href = '/api/profile/export';
      link.setAttribute('download', 'fretflow-data-export.json');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setError('Failed to initiate data export. Please try again.');
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm account deletion.');
      return;
    }

    try {
      setDeleting(true);
      setError(null);

      const res = await fetch('/api/profile/delete-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          reason: deleteReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to submit deletion request.');
      }

      // Deletion initiated, redirect to login
      router.push('/login?account_deleted=1');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error processing deletion request.');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/settings/security"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Security Settings</span>
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <FileText className="w-7 h-7 text-amber-400" />
          <span>Data Privacy & Account Lifecycle</span>
        </h1>
        <p className="text-sm text-slate-400">
          Manage your personal data archives, inspect data retention rules, and exercise your privacy rights under GDPR and CCPA.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Export Section */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Personal Data</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Download a machine-readable JSON archive containing your full profile, curriculum completion history, practice durations, quiz attempts, XP logs, and public support tickets. Sensitive credentials and internal staff records are strictly excluded.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={handleDownloadData}
            isLoading={downloading}
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 whitespace-nowrap self-start sm:self-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Data (.json)</span>
          </Button>
        </div>

        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Includes learning milestones & audio stats
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Zero-leakage: Secrets & staff notes omitted
          </span>
        </div>
      </Card>

      {/* Transparency & Legal Policies */}
      <Card className="p-6 border-slate-800 bg-slate-900/60 backdrop-blur-md space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Data Governance & Compliance Policies</span>
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          FretFlow does not sell or broker your personal information. Diagnostic logs are scrubbed of secrets prior to storage, and audio signals processed for tuning remain client-side within your browser.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400/90 hover:text-amber-300 underline underline-offset-4"
          >
            <span>Read Privacy Policy</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
          <span className="text-slate-600">•</span>
          <Link
            href="/terms"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400/90 hover:text-amber-300 underline underline-offset-4"
          >
            <span>Terms of Service</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </Card>

      {/* Danger Zone: Account Deletion */}
      <Card className="p-6 border-red-500/30 bg-red-950/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Delete Account & Erase Personal Records</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Initiates permanent account deletion. Your active device sessions will be revoked immediately and your account status shifted to deletion pending. Your progress, streak, and personal details will be scheduled for permanent removal per our retention policy.
            </p>
          </div>

          <Button
            variant="danger"
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600/80 hover:bg-red-600 text-white whitespace-nowrap self-start sm:self-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Request Deletion</span>
          </Button>
        </div>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">Confirm Account Deletion</h3>
                <p className="text-xs text-slate-400">
                  This action cannot be undone once confirmed. All active sessions will terminate.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Account Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter current password"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-red-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Why are you leaving FretFlow?"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm focus:border-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-red-300">
                  Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  required
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-red-500/50 text-white text-sm font-mono focus:border-red-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setError(null);
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  isLoading={deleting}
                  disabled={deleteConfirmation.trim().toUpperCase() !== 'DELETE'}
                  className="bg-red-600 hover:bg-red-500 text-white"
                >
                  Permanently Delete My Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
