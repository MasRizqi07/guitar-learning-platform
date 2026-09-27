'use client';

import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Video,
  Music,
  FileText,
  Upload,
  X,
  Search,
  Check,
  Loader2,
  Trash2,
} from 'lucide-react';

export interface PickedMediaAsset {
  id: string;
  publicUrl: string;
  originalName: string;
  type: string;
}

interface MediaPickerProps {
  value?: string | null; // assetId or legacy URL
  currentAsset?: PickedMediaAsset | null;
  allowedTypes?: ('IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT')[];
  onSelect: (asset: PickedMediaAsset | null) => void;
  label?: string;
  placeholder?: string;
}

interface MediaItem {
  id: string;
  originalName: string;
  publicUrl: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  altText?: string | null;
}

export function MediaPicker({
  value,
  currentAsset,
  allowedTypes,
  onSelect,
  label = 'Media Asset',
  placeholder = 'Select media from library or upload new...',
}: MediaPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    async function loadAssets() {
      try {
        const params = new URLSearchParams({
          page: '1',
          pageSize: '30',
          status: 'ACTIVE',
        });
        if (search.trim()) params.set('search', search.trim());
        if (selectedType !== 'ALL') {
          params.set('type', selectedType);
        } else if (allowedTypes && allowedTypes.length === 1) {
          params.set('type', allowedTypes[0]);
        }

        const res = await fetch(`/api/admin/media?${params.toString()}`);
        const data = await res.json();
        if (ignore) return;
        if (res.ok && data.data) {
          setAssets(data.data.items || []);
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
  }, [isOpen, search, selectedType, allowedTypes, refreshIndex]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(10);
      setUploadError(null);

      // 1. Init upload
      const initRes = await fetch('/api/admin/media/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
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
        body: file,
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
      setRefreshIndex((r) => r + 1);
      const activatedAsset = completeData.data;

      onSelect({
        id: activatedAsset.id,
        publicUrl: activatedAsset.publicUrl,
        originalName: activatedAsset.originalName,
        type: activatedAsset.type,
      });

      setIsOpen(false);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'IMAGE':
        return <ImageIcon className="w-5 h-5 text-amber-400" />;
      case 'VIDEO':
        return <Video className="w-5 h-5 text-purple-400" />;
      case 'AUDIO':
        return <Music className="w-5 h-5 text-emerald-400" />;
      default:
        return <FileText className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-semibold text-slate-300">{label}</label>}

      {/* Selected Preview Box */}
      {currentAsset || value ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#141824] border border-[#222938] group">
          <div className="flex items-center gap-3 min-w-0">
            {currentAsset?.type === 'IMAGE' || (value && value.match(/\.(jpg|jpeg|png|webp)$/i)) ? (
              <img
                src={currentAsset?.publicUrl || value || ''}
                alt="Thumbnail"
                className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-[#2A3245]"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#181D29] border border-[#2A3245] flex items-center justify-center">
                {renderIcon(currentAsset?.type || 'OTHER')}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {currentAsset?.originalName || value}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {currentAsset ? `Attached Asset (${currentAsset.type})` : 'Legacy Media URL'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(true);
                setLoading(true);
              }}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-[#222938] transition"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Remove Attachment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setLoading(true);
          }}
          className="w-full p-4 rounded-xl border border-dashed border-[#2A3245] hover:border-amber-500/50 bg-[#121620] hover:bg-[#151A26] flex items-center justify-center gap-2.5 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          <Upload className="w-4 h-4 text-amber-400" />
          <span>{placeholder}</span>
        </button>
      )}

      {/* Media Picker Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#12161F] border border-[#222938] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#1F2636] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Choose Media Asset</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select an asset from the media library or upload directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex border-b border-[#1F2636] bg-[#0E1118] px-4">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'library'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Media Library
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition ${
                  activeTab === 'upload'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload New
              </button>
            </div>

            {/* Content area */}
            <div className="p-4 flex-1 overflow-y-auto">
              {activeTab === 'library' ? (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setLoading(true);
                        }}
                        placeholder="Search media by name or tag..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[#0C0F16] border border-[#1F2636] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <select
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value);
                        setLoading(true);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[#0C0F16] border border-[#1F2636] text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="ALL">All Types</option>
                      <option value="IMAGE">Images</option>
                      <option value="AUDIO">Audio</option>
                      <option value="VIDEO">Videos</option>
                      <option value="DOCUMENT">Documents</option>
                    </select>
                  </div>

                  {/* Asset Grid */}
                  {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400 mb-2" />
                      Loading media library...
                    </div>
                  ) : assets.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No matching media assets found.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {assets.map((asset) => {
                        const isSelected = currentAsset?.id === asset.id || value === asset.id;
                        return (
                          <div
                            key={asset.id}
                            onClick={() => {
                              onSelect({
                                id: asset.id,
                                publicUrl: asset.publicUrl,
                                originalName: asset.originalName,
                                type: asset.type,
                              });
                              setIsOpen(false);
                            }}
                            className={`group relative p-2.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500'
                                : 'bg-[#151A24] border-[#1F2636] hover:border-slate-500'
                            }`}
                          >
                            <div className="aspect-square w-full rounded-lg bg-[#0D1017] overflow-hidden flex items-center justify-center mb-2">
                              {asset.type === 'IMAGE' ? (
                                <img
                                  src={asset.publicUrl}
                                  alt={asset.altText || asset.originalName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                renderIcon(asset.type)
                              )}
                            </div>

                            <p className="text-[11px] font-medium text-slate-200 truncate">
                              {asset.originalName}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase mt-0.5">
                              {asset.type} • {(asset.sizeBytes / 1024).toFixed(0)} KB
                            </p>

                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* Upload Tab */
                <div className="py-6 flex flex-col items-center justify-center space-y-4">
                  <div className="w-full max-w-md p-8 rounded-2xl border-2 border-dashed border-[#2A3245] hover:border-amber-500/50 bg-[#0E1118] text-center flex flex-col items-center justify-center space-y-3">
                    <Upload className="w-10 h-10 text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">
                        Upload media file
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PNG, JPG, WebP (10MB), MP3/WAV (30MB), MP4/WebM (100MB)
                      </p>
                    </div>

                    <label className="cursor-pointer px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition">
                      <span>Choose File</span>
                      <input
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        accept={
                          allowedTypes
                            ? allowedTypes
                                .map((t) =>
                                  t === 'IMAGE'
                                    ? 'image/jpeg,image/png,image/webp'
                                    : t === 'VIDEO'
                                    ? 'video/mp4,video/webm'
                                    : t === 'AUDIO'
                                    ? 'audio/mpeg,audio/wav,audio/ogg'
                                    : 'application/pdf'
                                )
                                .join(',')
                            : 'image/*,video/*,audio/*,application/pdf'
                        }
                      />
                    </label>
                  </div>

                  {uploading && (
                    <div className="w-full max-w-md space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Uploading & activating...</span>
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

                  {uploadError && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center max-w-md">
                      {uploadError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#1F2636] flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
