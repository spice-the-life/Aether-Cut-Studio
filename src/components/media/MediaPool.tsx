import React, { useState, useRef } from 'react';
import { MediaItem } from '../../types/editor';
import {
  Film,
  Music,
  Plus,
  Search,
  Upload,
  Folder,
  Tag,
  Clock,
  Sparkles,
  Image as ImageIcon,
  CheckCircle,
  LayoutGrid,
  List,
  ArrowDownToLine,
  Play,
  Tv,
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
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState<'all' | 'video' | 'image' | 'audio' | 'uploads'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentlyUploadedId, setRecentlyUploadedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // File Upload Handler (Real user files from Win / Mac / Linux)
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const itemId = `user-media-${Date.now()}-${i}`;

      try {
        const metadata = await mediaManager.registerUploadedFile(file, itemId);

        const newItem: MediaItem = {
          id: itemId,
          name: file.name,
          type: metadata.type || (file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'audio'),
          duration: metadata.duration || 10,
          fps: 24,
          resolution: metadata.resolution || { width: 1920, height: 1080 },
          color: metadata.type === 'video' ? '#24344d' : metadata.type === 'image' ? '#2a2842' : '#172b22',
          thumbnailUrl: metadata.thumbnailUrl || generateThumbnailDataUrl(file.name, '#1e293b', 'city'),
          sourceUrl: metadata.sourceUrl || '',
          tags: ['User Upload', metadata.type === 'video' ? 'Video' : metadata.type === 'image' ? 'Image' : 'Audio'],
          waveformData: generateWaveform(60, 3),
          videoElement: metadata.videoElement,
          imageElement: metadata.imageElement,
          isUploaded: true,
        };

        onAddMediaItem(newItem);
        setRecentlyUploadedId(newItem.id);
        onSelectMediaId(newItem.id);
        onPreviewMediaItem(newItem);
      } catch (err) {
        console.error('Failed to decode uploaded media:', err);
      }
    }

    setIsProcessing(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const filteredMedia = mediaItems.filter((m) => {
    if (activeCategory === 'uploads' && !m.isUploaded) return false;
    if (activeCategory !== 'all' && activeCategory !== 'uploads' && m.type !== activeCategory) return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
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
          <Film className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white tracking-wider uppercase font-sans">
            EVENT BROWSER
          </span>
          <span className="text-[11px] text-slate-500 font-mono tabular-nums">({filteredMedia.length})</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid vs List View Toggle */}
          <div className="flex items-center bg-[#0a0b0f] rounded-lg p-0.5 border border-[#20222d]">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-[#1e202c] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Filmstrip Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-[#1e202c] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Metadata List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {onLoadDemoMedia && mediaItems.length === 0 && (
            <button
              onClick={onLoadDemoMedia}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#171924] hover:bg-[#202334] border border-[#262838] text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap"
              title="Load 4K Sample Media"
            >
              <span>+ Demo</span>
            </button>
          )}

          <button
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
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search media by name or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-[#0a0b0e] border border-[#20222e] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 bg-[#090a0d] p-0.5 rounded-lg border border-[#1d1f2b]">
          {[
            { id: 'all', label: 'All' },
            { id: 'video', label: 'Video' },
            { id: 'image', label: 'Images' },
            { id: 'audio', label: 'Audio' },
            { id: 'uploads', label: 'Uploads' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
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
        <div className="px-3 py-2 bg-blue-950/70 border-b border-blue-800/40 text-[11px] text-blue-300 flex items-center gap-2 shrink-0">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Decoding video frames and registering media...</span>
        </div>
      )}

      {/* Media Items Canvas Body */}
      <div className="flex-1 p-3 overflow-y-auto min-h-0">
        {viewMode === 'grid' ? (
          /* RESPONSIVE MULTI-COLUMN FILMSTRIP GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredMedia.map((item) => {
              const isSelected = selectedMediaId === item.id;
              const isRecent = recentlyUploadedId === item.id;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectMediaId(item.id);
                    onPreviewMediaItem(item);
                  }}
                  onDoubleClick={() => onInsertClipAtPlayhead(item)}
                  className={`group relative rounded-xl border p-2 transition-all cursor-pointer flex flex-col justify-between ${
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
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0d1d17] flex items-center justify-center text-emerald-400">
                        <Music className="w-8 h-8 opacity-80" />
                      </div>
                    )}

                    {/* Clip Duration Badge */}
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm rounded text-[10px] font-mono text-white font-bold tabular-nums">
                      {Math.floor(item.duration)}s
                    </span>

                    {/* Double Click Hint Overlay */}
                    <div className="absolute inset-0 bg-blue-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="px-2 py-1 bg-black/85 rounded-md text-[10px] font-bold text-white tracking-wide border border-white/10">
                        Double Click to Insert
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
                      {/* Clean Unboxed Metadata (Zero-pill discipline) */}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400 font-mono tabular-nums">
                        {item.type === 'video' ? (
                          <>
                            <span>{item.resolution.width}×{item.resolution.height}</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.fps}fps</span>
                          </>
                        ) : item.type === 'image' ? (
                          <>
                            <span>Image</span>
                            <span aria-hidden="true">·</span>
                            <span>{item.resolution.width}×{item.resolution.height}</span>
                          </>
                        ) : (
                          <span>Audio 48kHz Stereo</span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Insert at Playhead (W) and Append (E) */}
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[#1c1e28]">
                      <button
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
          /* METADATA LIST VIEW */
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
                    onClick={() => {
                      onSelectMediaId(item.id);
                      onPreviewMediaItem(item);
                    }}
                    onDoubleClick={() => onInsertClipAtPlayhead(item)}
                    className={`hover:bg-[#161822] cursor-pointer transition-colors ${
                      selectedMediaId === item.id ? 'bg-[#151c2a]' : ''
                    }`}
                  >
                    <td className="py-2 px-3 truncate max-w-[160px] font-semibold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${item.type === 'video' ? 'bg-blue-400' : item.type === 'image' ? 'bg-purple-400' : 'bg-emerald-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </td>
                    <td className="py-2 px-2 text-[11px] text-slate-400 font-mono uppercase">{item.type}</td>
                    <td className="py-2 px-2 text-[11px] text-slate-300 font-mono tabular-nums">{Math.floor(item.duration)}s</td>
                    <td className="py-2 px-2 text-[11px] text-slate-400 font-mono tabular-nums">
                      {item.resolution.width > 0 ? `${item.resolution.width}×${item.resolution.height}` : 'Audio'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
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
          <div className="text-center py-14 px-4 rounded-xl border border-dashed border-[#242634] text-xs text-slate-500 bg-[#0d0e13]/50">
            <Upload className="w-10 h-10 mx-auto text-slate-600 mb-3" />
            <span className="block font-bold text-slate-300 text-sm">Event Library is Empty</span>
            <span className="text-[11px] text-slate-500 block mt-1 max-w-sm mx-auto leading-relaxed">
              Drop any video (MP4, WebM, MOV), image (PNG, JPG), or audio (WAV, MP3) file to immediately edit on the timeline.
            </span>
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-[#0a84ff] hover:bg-[#0071e3] text-white font-bold rounded-lg text-xs shadow-md transition-colors"
              >
                Browse Computer
              </button>
              {onLoadDemoMedia && (
                <button
                  onClick={onLoadDemoMedia}
                  className="px-3 py-1.5 bg-[#171924] hover:bg-[#202334] border border-[#262838] text-slate-300 hover:text-white font-semibold rounded-lg text-xs transition-colors"
                >
                  + Load 4K Demo Footage
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3.5 py-2 border-t border-[#1f212c] bg-[#111218] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <span>Click to select · Double-click to insert</span>
        <span>Keys: <kbd className="text-slate-200 font-mono font-bold">W</kbd> Insert · <kbd className="text-slate-200 font-mono font-bold">E</kbd> Append</span>
      </div>
    </div>
  );
};
