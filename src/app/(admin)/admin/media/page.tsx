'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Upload,
  Search,
  Grid,
  List,
  ExternalLink,
  Copy,
  Trash2,
  Archive,
  Save,
  Check,
  X,
  Loader2,
  HardDrive,
  Layers,
} from 'lucide-react';

interface MediaAssetItem {
  id: string;
  type: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'OTHER';
  status: 'ACTIVE' | 'ARCHIVED' | 'UPLOADING' | 'FAILED' | 'DELETED';
  provider: string;
  storageKey: string;
  publicUrl: string;
  originalName: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  altText: string | null;
  caption: string | null;
  createdAt: string;
  usageCount: number;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface AssetDetail extends MediaAssetItem {
  courseThumbnails: Array<{ id: string; title: string; slug: string; status: string }>;
  lessonSections: Array<{
    id: string;
    title: string;
    type: string;
    order: number;
    lesson: {
      id: string;
      title: string;
      slug: string;
      status: string;
      module: {
        id: string;
        title: string;
        course: { id: string; title: string; slug: string };
      };
    };
  }>;
}

export default function MediaLibraryPage() {
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [usageFilter, setUsageFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<AssetDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Detail edits
  const [editAltText, setEditAltText] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Upload modal state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;
    async function loadAssets() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: '24',
          type: typeFilter,
          status: statusFilter,
          usage: usageFilter,
        });
        if (search.trim()) params.set('search', search.trim());

        const res = await fetch(`/api/admin/media?${params.toString()}`);
        const data = await res.json();
        if (ignore) return;
        if (res.ok && data.data) {
          setAssets(data.data.items || []);
          setTotalPages(data.data.pagination.totalPages || 1);
          setTotalCount(data.data.pagination.total || 0);
        }
      } catch {
        // ignore
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAssets();
    return () => {
      ignore = true;
    };
  }, [page, search, typeFilter, statusFilter, usageFilter, refreshIndex]);

  // Load detail when selected
  useEffect(() => {
    if (!selectedAssetId) return;

    let ignore = false;
    async function loadDetail() {
      try {
        setActionError(null);
        setActionSuccess(null);
        const res = await fetch(`/api/admin/media/${selectedAssetId}`);
        const data = await res.json();
        if (!ignore && res.ok && data.data) {
          setDetailAsset(data.data);
          setEditAltText(data.data.altText || '');
          setEditCaption(data.data.caption || '');
        }
      } catch (err: unknown) {
        if (!ignore) {
          setActionError(err instanceof Error ? err.message : 'Failed to load details');
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    }

    loadDetail();
    return () => {
      ignore = true;
    };
  }, [selectedAssetId]);

  const handleSaveMetadata = async () => {
    if (!detailAsset) return;
    try {
      setSavingDetail(true);
      setActionError(null);
      setActionSuccess(null);

      const res = await fetch(`/api/admin/media/${detailAsset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          altText: editAltText,
          caption: editCaption,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to update metadata');
      }

      setActionSuccess('Metadata updated successfully');
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingDetail(false);
    }
  };

  const handleArchive = async () => {
    if (!detailAsset) return;
    if (!confirm(`Are you sure you want to archive "${detailAsset.originalName}"?`)) return;

    try {
      setSavingDetail(true);
      setActionError(null);
      const res = await fetch(`/api/admin/media/${detailAsset.id}/archive`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to archive asset');
      }

      setActionSuccess('Asset archived successfully');
      setSelectedAssetId(null);
      setDetailAsset(null);
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Archive failed');
    } finally {
      setSavingDetail(false);
    }
  };

  const handleDelete = async () => {
    if (!detailAsset) return;
    if (detailAsset.usageCount > 0) {
      setActionError(
        `Cannot delete this asset because it is in use by ${detailAsset.usageCount} content item(s). Detach or replace it first.`
      );
      return;
    }

    if (
      !confirm(
        `Are you sure you want to permanently delete "${detailAsset.originalName}" from storage and database? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setSavingDetail(true);
      setActionError(null);
      const res = await fetch(`/api/admin/media/${detailAsset.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to delete asset');
      }

      setSelectedAssetId(null);
      setDetailAsset(null);
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSavingDetail(false);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(10);

      // 1. Init upload
      const initRes = await fetch('/api/admin/media/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: uploadFile.name,
          mimeType: uploadFile.type || 'application/octet-stream',
          sizeBytes: uploadFile.size,
          altText: uploadAltText || null,
          caption: uploadCaption || null,
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) {
        throw new Error(initData.error?.message || 'Failed to initialize upload');
      }

      const { asset, uploadTarget } = initData.data;
      setUploadProgress(40);

      // 2. Direct upload to target URL
      const uploadRes = await fetch(uploadTarget.uploadUrl, {
        method: uploadTarget.method,
        headers: uploadTarget.headers || {},
        body: uploadFile,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file content to storage');
      }
      setUploadProgress(80);

      // 3. Complete upload
      const completeRes = await fetch('/api/admin/media/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error?.message || 'Failed to finalize asset activation');
      }

      setUploadProgress(100);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadAltText('');
      setUploadCaption('');
      setRefreshIndex((r) => r + 1);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const copyPublicUrl = () => {
    if (!detailAsset) return;
    navigator.clipboard.writeText(detailAsset.publicUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const renderMediaTypeIcon = (type: string, className = 'w-5 h-5') => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon className={`${className} text-amber-400`} />;
      case 'VIDEO':
        return <Video className={`${className} text-purple-400`} />;
      case 'AUDIO':
        return <Music className={`${className} text-emerald-400`} />;
      default:
        return <FileText className={`${className} text-blue-400`} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#222938]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-amber-400" />
            <span>Media Library</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centralized production media management for courses, lessons, audio exercises, and diagrams.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsUploadOpen(true);
            setUploadError(null);
            setUploadProgress(0);
          }}
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition self-start sm:self-auto"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Media</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#121620] border border-[#1E2536]">
          <div className="text-[11px] font-medium text-slate-400">Total Assets</div>
          <div className="text-lg font-bold text-slate-100 mt-1">{totalCount}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121620] border border-[#1E2536]">
          <div className="text-[11px] font-medium text-slate-400">Active Library</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {statusFilter === 'ACTIVE' ? totalCount : '—'}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121620] border border-[#1E2536]">
          <div className="text-[11px] font-medium text-slate-400">Storage Provider</div>
          <div className="text-lg font-bold text-amber-400 mt-1 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-amber-400" />
            <span className="text-xs uppercase">{process.env.NEXT_PUBLIC_STORAGE_PROVIDER || 'Production / Mock'}</span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#121620] border border-[#1E2536]">
          <div className="text-[11px] font-medium text-slate-400">Protection</div>
          <div className="text-xs font-bold text-slate-300 mt-2">
            Reference Guarded
          </div>
        </div>
      </div>

      {/* Controls & Search Bar */}
      <div className="p-3.5 rounded-xl bg-[#121620] border border-[#1F2636] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search filename, alt text, or caption..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Media Types</option>
            <option value="IMAGE">Images</option>
            <option value="AUDIO">Audio</option>
            <option value="VIDEO">Videos</option>
            <option value="DOCUMENT">Documents</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
            <option value="ALL">All Statuses</option>
          </select>

          <select
            value={usageFilter}
            onChange={(e) => {
              setUsageFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Usages</option>
            <option value="USED">In Use</option>
            <option value="UNUSED">Unused</option>
          </select>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#0C0F16] border border-[#222A3A]">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${
              viewMode === 'grid' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded ${
              viewMode === 'table' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Listing */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Loader2 className="w-7 h-7 animate-spin text-amber-400 mb-2" />
          Loading media assets...
        </div>
      ) : assets.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-[#121620] border border-[#1E2536] p-8 space-y-3">
          <ImageIcon className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-200">No media assets found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Upload images, audio recordings, or video clips to build your curriculum media asset repository.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {assets.map((asset) => (
            <div
              key={asset.id}
              onClick={() => setSelectedAssetId(asset.id)}
              className="group relative p-2.5 rounded-xl bg-[#121620] border border-[#1F2636] hover:border-slate-500 cursor-pointer transition flex flex-col justify-between overflow-hidden shadow-sm"
            >
              <div className="aspect-square w-full rounded-lg bg-[#0C0F16] overflow-hidden flex items-center justify-center mb-2 relative">
                {asset.type === 'IMAGE' ? (
                  <img
                    src={asset.publicUrl}
                    alt={asset.altText || asset.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  renderMediaTypeIcon(asset.type, 'w-8 h-8')
                )}

                {/* Usage badge */}
                <div className="absolute top-1.5 right-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      asset.usageCount > 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {asset.usageCount > 0 ? `${asset.usageCount} in use` : 'Unused'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-200 truncate group-hover:text-amber-400 transition">
                  {asset.originalName}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span className="uppercase">{asset.type}</span>
                  <span>{(asset.sizeBytes / 1024).toFixed(0)} KB</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl bg-[#121620] border border-[#1F2636] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0C0F16] text-slate-400 text-[11px] font-semibold border-b border-[#1F2636]">
                <tr>
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Uploaded By</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2636]">
                {assets.map((asset) => (
                  <tr
                    key={asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className="hover:bg-[#151B26] cursor-pointer transition"
                  >
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-[#0D1017] border border-[#222A3A] flex items-center justify-center shrink-0 overflow-hidden">
                        {asset.type === 'IMAGE' ? (
                          <img
                            src={asset.publicUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          renderMediaTypeIcon(asset.type, 'w-4 h-4')
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate max-w-[200px]">
                          {asset.originalName}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                          {asset.altText || 'No alt text'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 uppercase text-[11px] font-mono text-amber-400">
                      {asset.type}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {(asset.sizeBytes / 1024).toFixed(0)} KB
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          asset.usageCount > 0
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {asset.usageCount} place(s)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-[11px]">
                      {asset.createdBy.name || asset.createdBy.email}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssetId(asset.id);
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 text-xs text-slate-400">
          <span>
            Page {page} of {totalPages} ({totalCount} total items)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:text-white"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 hover:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Asset Detail Drawer / Modal */}
      {selectedAssetId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#12161F] border border-[#222938] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#1F2636] flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {detailAsset && renderMediaTypeIcon(detailAsset.type)}
                <span>Asset Inspection: {detailAsset?.originalName || 'Loading...'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedAssetId(null);
                  setDetailAsset(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs">
              {detailLoading || !detailAsset ? (
                <div className="py-12 flex justify-center text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                </div>
              ) : (
                <>
                  {/* Feedback alerts */}
                  {actionError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
                      {actionError}
                    </div>
                  )}
                  {actionSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                      {actionSuccess}
                    </div>
                  )}

                  {/* Visual Preview */}
                  <div className="rounded-xl bg-[#0B0E14] border border-[#1E2536] p-4 flex items-center justify-center overflow-hidden">
                    {detailAsset.type === 'IMAGE' ? (
                      <img
                        src={detailAsset.publicUrl}
                        alt={detailAsset.altText || ''}
                        className="max-h-64 object-contain rounded-lg"
                      />
                    ) : detailAsset.type === 'AUDIO' ? (
                      <div className="w-full max-w-md py-4 space-y-2 text-center">
                        <Music className="w-8 h-8 text-emerald-400 mx-auto" />
                        <audio controls src={detailAsset.publicUrl} className="w-full" />
                      </div>
                    ) : detailAsset.type === 'VIDEO' ? (
                      <video controls src={detailAsset.publicUrl} className="max-h-64 rounded-lg w-full" />
                    ) : (
                      <div className="py-6 text-center space-y-2">
                        <FileText className="w-10 h-10 text-blue-400 mx-auto" />
                        <p className="text-slate-400">{detailAsset.mimeType}</p>
                      </div>
                    )}
                  </div>

                  {/* Public URL Box */}
                  <div className="p-3 rounded-xl bg-[#0D1017] border border-[#1F2636] flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Public CDN URL</div>
                      <div className="font-mono text-slate-300 truncate mt-0.5">{detailAsset.publicUrl}</div>
                    </div>
                    <button
                      type="button"
                      onClick={copyPublicUrl}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 shrink-0"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2636]">
                      <div className="text-[10px] text-slate-500 uppercase">File Size</div>
                      <div className="font-semibold text-slate-200 mt-0.5">
                        {(detailAsset.sizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2636]">
                      <div className="text-[10px] text-slate-500 uppercase">MIME Type</div>
                      <div className="font-semibold text-slate-200 mt-0.5 truncate">{detailAsset.mimeType}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2636]">
                      <div className="text-[10px] text-slate-500 uppercase">Provider</div>
                      <div className="font-semibold text-amber-400 mt-0.5 uppercase">{detailAsset.provider}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#1F2636]">
                      <div className="text-[10px] text-slate-500 uppercase">Usage Count</div>
                      <div
                        className={`font-semibold mt-0.5 ${
                          detailAsset.usageCount > 0 ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      >
                        {detailAsset.usageCount} place(s)
                      </div>
                    </div>
                  </div>

                  {/* Editable metadata */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Alt Text (Accessibility)
                      </label>
                      <input
                        type="text"
                        value={editAltText}
                        onChange={(e) => setEditAltText(e.target.value)}
                        placeholder="Descriptive text for screen readers..."
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Caption / Internal Note
                      </label>
                      <input
                        type="text"
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Optional internal caption or attribution..."
                        className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Exact Usage Inspection List */}
                  <div className="pt-2 border-t border-[#1F2636] space-y-2">
                    <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Content Attachment References ({detailAsset.usageCount})</span>
                    </h4>

                    {detailAsset.usageCount === 0 ? (
                      <p className="text-[11px] text-slate-500">
                        This asset is currently unused. It can be safely deleted or archived.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {/* Course attachments */}
                        {detailAsset.courseThumbnails.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-lg bg-[#0D1017] border border-[#1F2636] flex items-center justify-between"
                          >
                            <div>
                              <span className="text-[10px] text-amber-400 font-bold uppercase mr-1.5">[Course]</span>
                              <span className="text-slate-200 font-medium">{c.title}</span>
                            </div>
                            <Link
                              href={`/admin/courses/${c.id}`}
                              className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <span>Edit Course</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        ))}

                        {/* Lesson section attachments */}
                        {detailAsset.lessonSections.map((s) => (
                          <div
                            key={s.id}
                            className="p-2 rounded-lg bg-[#0D1017] border border-[#1F2636] flex items-center justify-between"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[10px] text-blue-400 font-bold uppercase mr-1.5">
                                [Lesson Section]
                              </span>
                              <span className="text-slate-200 font-medium">
                                {s.lesson?.title} &gt; {s.title} ({s.type})
                              </span>
                            </div>
                            <Link
                              href={`/admin/lessons/${s.lesson?.id}`}
                              className="text-amber-400 hover:underline flex items-center gap-1 text-[11px] shrink-0"
                            >
                              <span>Edit Lesson</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            {detailAsset && (
              <div className="p-3.5 border-t border-[#1F2636] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={savingDetail}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                      detailAsset.usageCount > 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                    }`}
                    title={
                      detailAsset.usageCount > 0
                        ? 'Cannot delete: asset is currently attached to curriculum items'
                        : 'Delete asset safely'
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Safely</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={savingDetail || detailAsset.status === 'ARCHIVED'}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-40"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAssetId(null);
                      setDetailAsset(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMetadata}
                    disabled={savingDetail}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {savingDetail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleStartUpload}
            className="w-full max-w-lg bg-[#12161F] border border-[#222938] rounded-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2636]">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Upload New Media Asset</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {uploadError}
              </div>
            )}

            {/* Dropzone */}
            <div className="p-6 rounded-xl border-2 border-dashed border-[#2A3245] hover:border-amber-500/50 bg-[#0E1118] text-center flex flex-col items-center justify-center space-y-2">
              <Upload className="w-8 h-8 text-amber-400" />
              <p className="text-xs font-semibold text-slate-200">
                {uploadFile ? uploadFile.name : 'Choose media file to upload'}
              </p>
              <p className="text-[11px] text-slate-500">
                PNG, JPG, WebP (10MB) • MP3, WAV (30MB) • MP4, WebM (100MB)
              </p>

              <label className="cursor-pointer mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition">
                <span>Browse File</span>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm,application/pdf"
                />
              </label>
            </div>

            {/* Alt & Caption */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alt Text (for accessibility)
                </label>
                <input
                  type="text"
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                  placeholder="e.g. C Major chord diagram on fretboard"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Internal Caption / Attribution
                </label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder="Optional internal attribution note"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#0C0F16] border border-[#222A3A] text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Uploading directly to storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#1F2636] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!uploadFile || uploading}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{uploading ? 'Processing...' : 'Upload & Activate'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
