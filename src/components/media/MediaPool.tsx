import React, { useState, useRef } from 'react';
import { MediaItem, ToastNotification } from '../../types/editor';
import {
  Film,
  Music,
  Search,
  Upload,
  LayoutGrid,
  List,
  ArrowDownToLine,
  GripVertical,
} from 'lucide-react';
import { mediaManager } from '../../services/mediaManager';
import { generateThumbnailDataUrl, generateWaveform } from '../../services/sampleMedia';

interface MediaPoolProps {
  mediaItems: MediaItem[];
  selectedMediaId: string | null;
  onSelectMediaId: (id: string | null) => void;
  onPreviewMediaItem: (item: MediaItem) => void;
  onAddMediaItem: (item: MediaItem) => void;
  onInsertClipAtPlayhead: (item: MediaItem) => void;
  onAppendClipToTimeline: (item: MediaItem) => void;
  onLoadDemoMedia?: () => void;
  onClose?: () => void;
  onNotify?: (toast: Omit<ToastNotification, 'id'>) => void;
}

export const MediaPool: React.FC<MediaPoolProps> = ({
  mediaItems,
  selectedMediaId,
  onSelectMediaId,
  onPreviewMediaItem,
  onAddMediaItem,
  onInsertClipAtPlayhead,
  onAppendClipToTimeline,
  onLoadDemoMedia,
  onNotify,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState<'all' | 'video' | 'image' | 'audio' | 'uploads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentlyUploadedId, setRecentlyUploadedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    let importedCount = 0;
    const failedNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      const isSupportedMime =
        file.type.startsWith('video/') ||
        file.type.startsWith('audio/') ||
        file.type.startsWith('image/') ||
        /\.(mp4|mov|webm|mkv|m4v|wav|mp3|ogg|aac|m4a|flac|png|jpe?g|webp|gif)$/i.test(lower);

      if (!isSupportedMime) {
        failedNames.push(`${file.name} (unsupported format)`);
        continue;
      }

      const itemId = `user-media-${Date.now()}-${i}`;

      try {
        const metadata = await mediaManager.registerUploadedFile(file, itemId);
        const inferredType =
          metadata.type ||
          (file.type.startsWith('video') || /\.(mp4|mov|webm|mkv|m4v)$/i.test(lower)
            ? 'video'
            : file.type.startsWith('image') || /\.(png|jpe?g|webp|gif)$/i.test(lower)
            ? 'image'
            : 'audio');

        const newItem: MediaItem = {
          id: itemId,
          name: file.name,
          type: inferredType,
          duration: metadata.duration || 10,
          fps: 24,
          resolution: metadata.resolution || { width: 1920, height: 1080 },
          color:
            inferredType === 'video'
              ? '#24344d'
              : inferredType === 'image'
              ? '#2a2842'
              : '#172b22',
          thumbnailUrl:
            metadata.thumbnailUrl || generateThumbnailDataUrl(file.name, '#1e293b', 'city'),
          sourceUrl: metadata.sourceUrl || '',
          tags: [
            'User Upload',
            inferredType === 'video' ? 'Video' : inferredType === 'image' ? 'Image' : 'Audio',
          ],
          waveformData: generateWaveform(60, 3),
          videoElement: metadata.videoElement,
          imageElement: metadata.imageElement,
          isUploaded: true,
        };

        onAddMediaItem(newItem);
        setRecentlyUploadedId(newItem.id);
        onSelectMediaId(newItem.id);
        onPreviewMediaItem(newItem);
        importedCount++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Decode failed';
        failedNames.push(`${file.name} (${reason})`);
      }
    }

    setIsProcessing(false);

    if (failedNames.length > 0) {
      onNotify?.({
        level: 'error',
        title: `Could not import ${failedNames.length} file${failedNames.length > 1 ? 's' : ''}`,
        message: failedNames.slice(0, 2).join(', '),
      });
    } else if (importedCount > 0) {
      onNotify?.({
        level: 'success',
        title: `Imported ${importedCount} media item${importedCount > 1 ? 's' : ''}`,
        message: 'Drag onto any timeline lane or press W to insert at playhead.',
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleMediaDragStart = (e: React.DragEvent, item: MediaItem) => {
    onSelectMediaId(item.id);
    e.dataTransfer.effectAllowed = 'copy';
    const payload = JSON.stringify({
      mediaId: item.id,
      name: item.name,
      type: item.type,
      duration: item.duration,
      color: item.color,
    });
    e.dataTransfer.setData('application/x-aethercut-media', payload);
    e.dataTransfer.setData('text/plain', item.name);
  };

  const filteredMedia = mediaItems.filter((m) => {
    if (activeCategory === 'uploads' && !m.isUploaded) return false;
    if (activeCategory !== 'all' && activeCategory !== 'uploads' && m.type !== activeCategory)
      return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <aside
      aria-label="Event Browser Media Library"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className={`w-full h-full flex flex-col bg-[#0e0f14] select-none text-slate-300 transition-colors ${
        isDraggingOver ? 'bg-[#141926] ring-2 ring-blue-500 ring-inset' : ''
      }`}
    >
      {/* Top Header */}
      <div className="px-3.5 py-2.5 border-b border-[#1f212c] bg-[#13141a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-xs font-bold text-white tracking-wider uppercase font-sans">
            EVENT BROWSER
          </span>
          <span className="text-[11px] text-slate-500 font-mono tabular-nums">
            ({filteredMedia.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid vs List View Toggle */}
          <div
            role="group"
            aria-label="Browser view mode"
            className="flex items-center bg-[#0a0b0f] rounded-lg p-0.5 border border-[#20222d]"
          >
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Filmstrip Grid View"
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[#1e202c] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Filmstrip Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="Metadata List View"
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#1e202c] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Metadata List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <input
            ref={fileInputRef}
            data-media-upload="true"
            type="file"
            multiple
            accept="video/*,audio/*,image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {onLoadDemoMedia && mediaItems.length === 0 && (
            <button
              type="button"
              onClick={onLoadDemoMedia}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#171924] hover:bg-[#202334] border border-[#262838] text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              title="Load 4K Sample Media"
            >
              <span>+ Demo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition-colors whitespace-nowrap"
            title="Import Media Files from Computer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="px-3.5 py-2.5 border-b border-[#1c1e28] bg-[#111218] space-y-2 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" aria-hidden="true" />
          <input
            type="text"
            aria-label="Search media by name or tag"
            placeholder="Search media by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0a0b0e] border border-[#20222e] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* Category Tabs */}
        <div
          role="tablist"
          aria-label="Media categories"
          className="flex items-center gap-1 bg-[#090a0d] p-0.5 rounded-lg border border-[#1d1f2b]"
        >
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'video', label: 'Video' },
              { id: 'image', label: 'Images' },
              { id: 'audio', label: 'Audio' },
              { id: 'uploads', label: 'Uploads' },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeCategory === cat.id
                  ? 'bg-[#1e202c] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-[#151722]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Processing Banner */}
      {isProcessing && (
        <div
          role="status"
          aria-live="polite"
          className="px-3 py-2 bg-blue-950/70 border-b border-blue-800/40 text-[11px] text-blue-300 flex items-center gap-2 shrink-0"
        >
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Decoding video frames and registering media...</span>
        </div>
      )}

      {/* Media Items Canvas Body */}
      <div className="flex-1 p-3 overflow-y-auto min-h-0">
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredMedia.map((item) => {
              const isSelected = selectedMediaId === item.id;
              const isRecent = recentlyUploadedId === item.id;

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleMediaDragStart(e, item)}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${item.name}, ${item.type}, ${Math.floor(item.duration)} seconds. Drag to timeline or press Enter to insert.`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectMediaId(item.id);
                      onPreviewMediaItem(item);
                    }
                  }}
                  onClick={() => {
                    onSelectMediaId(item.id);
                    onPreviewMediaItem(item);
                  }}
                  onDoubleClick={() => onInsertClipAtPlayhead(item)}
                  className={`group relative rounded-xl border p-2 transition-all cursor-grab active:cursor-grabbing flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#0a84ff] bg-[#141926] ring-1 ring-blue-500/60 shadow-lg'
                      : 'border-[#1e202b] bg-[#12131a] hover:border-slate-500 hover:bg-[#171922]'
                  } ${isRecent ? 'ring-2 ring-amber-400' : ''}`}
                >
                  {/* Thumbnail / Filmstrip Preview */}
                  <div className="w-full aspect-video rounded-lg overflow-hidden bg-black relative shrink-0 border border-[#222430] flex items-center justify-center">
                    {item.type === 'image' || item.type === 'video' ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        draggable={false}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0d1d17] flex items-center justify-center text-emerald-400">
                        <Music className="w-8 h-8 opacity-80" />
                      </div>
                    )}

                    {/* Drag indicator top-left */}
                    <span className="absolute top-1 left-1 px-1 py-0.5 bg-black/75 rounded text-[9px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      <GripVertical className="w-2.5 h-2.5" />
                      Drag
                    </span>

                    {/* Clip Duration */}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm rounded text-[10px] font-mono text-white font-bold tabular-nums">
                      {Math.floor(item.duration)}s
                    </span>

                    {/* Hover Hint Overlay */}
                    <div className="absolute inset-0 bg-blue-950/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                      <span className="px-2 py-1 bg-black/85 rounded-md text-[10px] font-bold text-white tracking-wide border border-white/10">
                        Drag to Timeline · Double-Click
                      </span>
                    </div>
                  </div>

                  {/* Metadata Info */}
                  <div className="mt-2 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                          {item.name}
                        </h4>
                        {item.isUploaded && (
                          <span className="text-[9px] font-mono font-bold text-blue-400 shrink-0">
                            UPLOAD
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono tabular-nums">
                        {item.type === 'video' ? (
                          <>
                            <span>
                              {item.resolution.width}×{item.resolution.height}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{item.fps}fps</span>
                          </>
                        ) : item.type === 'image' ? (
                          <>
                            <span>Image</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {item.resolution.width}×{item.resolution.height}
                            </span>
                          </>
                        ) : (
                          <span>Audio 48kHz Stereo</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#1c1e28]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsertClipAtPlayhead(item);
                        }}
                        className="flex-1 py-1 px-2 bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded-md text-[10px] font-bold shadow-sm transition-colors flex items-center justify-center gap-1"
                        title="Insert Clip at Playhead (W)"
                      >
                        <ArrowDownToLine className="w-3 h-3" />
                        <span>Insert (W)</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppendClipToTimeline(item);
                        }}
                        className="py-1 px-2.5 bg-[#1b1d28] hover:bg-[#252837] text-slate-300 hover:text-white rounded-md text-[10px] font-semibold transition-colors border border-[#262838]"
                        title="Append to Timeline End (E)"
                      >
                        Append (E)
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-[#1f212c] overflow-hidden bg-[#101117]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#14151e] border-b border-[#1f212c] text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Clip Name</th>
                  <th className="py-2.5 px-2">Type</th>
                  <th className="py-2.5 px-2">Duration</th>
                  <th className="py-2.5 px-2">Resolution</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a1c26]">
                {filteredMedia.map((item) => (
                  <tr
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleMediaDragStart(e, item)}
                    onClick={() => {
                      onSelectMediaId(item.id);
                      onPreviewMediaItem(item);
                    }}
                    onDoubleClick={() => onInsertClipAtPlayhead(item)}
                    className={`hover:bg-[#161822] cursor-grab active:cursor-grabbing transition-colors ${
                      selectedMediaId === item.id ? 'bg-[#151c2a]' : ''
                    }`}
                  >
                    <td className="py-2 px-3 truncate max-w-[160px] font-semibold text-white flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.type === 'video'
                            ? 'bg-blue-400'
                            : item.type === 'image'
                            ? 'bg-purple-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                    </td>
                    <td className="py-2 px-2 text-[11px] text-slate-400 font-mono uppercase">
                      {item.type}
                    </td>
                    <td className="py-2 px-2 text-[11px] text-slate-300 font-mono tabular-nums">
                      {Math.floor(item.duration)}s
                    </td>
                    <td className="py-2 px-2 text-[11px] text-slate-400 font-mono tabular-nums">
                      {item.resolution.width > 0
                        ? `${item.resolution.width}×${item.resolution.height}`
                        : 'Audio'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInsertClipAtPlayhead(item);
                        }}
                        className="px-2.5 py-1 bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded text-[10px] font-bold transition-colors"
                      >
                        + Insert
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredMedia.length === 0 && (
          <div className="text-center py-10 px-5 rounded-xl border border-dashed border-[#2b3044] text-xs text-slate-400 bg-linear-to-b from-[#131520]/90 to-[#0d0e14]/90 shadow-inner">
            <div className="w-11 h-11 mx-auto rounded-xl bg-[#171b29] border border-[#283047] flex items-center justify-center text-[#0a84ff] mb-3 shadow-sm">
              <Upload className="w-5 h-5" />
            </div>
            <span className="block font-semibold text-white text-sm tracking-tight">
              {mediaItems.length === 0 ? 'Event Library is Empty' : 'No Matching Media'}
            </span>
            <span className="text-[11px] text-slate-400 block mt-1 max-w-xs mx-auto leading-relaxed">
              {mediaItems.length === 0
                ? 'Drag and drop files directly into this browser or import from your computer to start editing.'
                : 'Try clearing your search filter or switching media categories above.'}
            </span>
            <div className="mt-2 text-[10px] font-mono text-slate-500 tracking-tight">
              MP4 · WebM · MOV · WAV · MP3 · PNG · JPG
            </div>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] text-white font-semibold rounded-md text-xs shadow-sm transition-colors"
              >
                Import Media
              </button>
              {onLoadDemoMedia && mediaItems.length === 0 && (
                <button
                  type="button"
                  onClick={onLoadDemoMedia}
                  className="px-3 py-1.5 bg-[#171924] hover:bg-[#202334] border border-[#282c3f] text-slate-200 hover:text-white font-semibold rounded-md text-xs transition-colors"
                >
                  Load 4K Demo Footage
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-2 border-t border-[#1f212c] bg-[#111218] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span>Drag onto timeline · Double-click to insert</span>
        <span>
          Keys: <kbd className="text-slate-200 font-mono font-bold">W</kbd> Insert ·{' '}
          <kbd className="text-slate-200 font-mono font-bold">E</kbd> Append
        </span>
      </div>
    </aside>
  );
};
