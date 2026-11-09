import React, { useState, useEffect } from 'react';
import { TimelineTrack, TimelineClip } from '../../types/editor';
import { Volume2, VolumeX, Sliders, Music, Headphones } from 'lucide-react';
import { audioEngine } from '../../engine/audioEngine';

interface AudioMixerProps {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onUpdateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;
}

export const AudioMixer: React.FC<AudioMixerProps> = ({
  tracks,
  clips,
  onUpdateClip,
  onUpdateTrack,
}) => {
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [masterMuted, setMasterMuted] = useState(false);
  const [meterLevels, setMeterLevels] = useState({ leftPeak: -60, rightPeak: -60 });
  const [eq, setEq] = useState({ low: 0, mid: 0, high: 0 });

  useEffect(() => {
    let animId: number;
    const poll = () => {
      const levels = audioEngine.getMeterLevels();
      setMeterLevels({ leftPeak: levels.leftPeak, rightPeak: levels.rightPeak });
      animId = requestAnimationFrame(poll);
    };
    animId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleMasterChange = (vol: number) => {
    setMasterVolume(vol);
    audioEngine.setVolume(vol);
  };

  const toggleMasterMute = () => {
    const next = !masterMuted;
    setMasterMuted(next);
    audioEngine.setMute(next);
  };

  const dbToPercent = (db: number) => {
    if (db <= -60) return 0;
    if (db >= 0) return 90 + (db / 3) * 10;
    return Math.max(0, Math.min(100, ((db + 60) / 60) * 90));
  };

  return (
    <div className="h-full flex flex-col bg-[#111218] overflow-y-auto select-none">
      {/* Top Header */}
      <div className="px-6 py-2.5 border-b border-[#222533] bg-[#141620] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sliders className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-white tracking-wide">FAIRLIGHT AUDIO MIXING DESK</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-emerald-400 font-mono">48 kHz 24-bit Broadcast Master</span>
        </div>

        {/* Master Equalizer controls */}
        <div className="flex items-center gap-4 bg-[#181a25] px-3 py-1 rounded-lg border border-[#272b3b]">
          <span className="text-[10px] text-slate-400 font-semibold uppercase">Master 3-Band EQ</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Low</span>
            <input
              type="range"
              min={-12}
              max={12}
              value={eq.low}
              onChange={(e) => setEq({ ...eq, low: parseInt(e.target.value, 10) })}
              className="w-16 h-1 bg-[#282c3c] rounded appearance-none cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">Mid</span>
            <input
              type="range"
              min={-12}
              max={12}
              value={eq.mid}
              onChange={(e) => setEq({ ...eq, mid: parseInt(e.target.value, 10) })}
              className="w-16 h-1 bg-[#282c3c] rounded appearance-none cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">High</span>
            <input
              type="range"
              min={-12}
              max={12}
              value={eq.high}
              onChange={(e) => setEq({ ...eq, high: parseInt(e.target.value, 10) })}
              className="w-16 h-1 bg-[#282c3c] rounded appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Channel Strips Row */}
      <div className="flex-1 p-6 flex items-stretch gap-4 overflow-x-auto justify-center">
        {tracks.map((track) => {
          const trackClips = clips.filter((c) => c.trackId === track.id);
          const firstClip = trackClips[0];
          const volume = firstClip ? firstClip.volume : 1.0;
          const pan = firstClip ? firstClip.pan : 0;

          return (
            <div
              key={track.id}
              className="w-40 bg-[#161822] rounded-xl border border-[#262939] p-3 flex flex-col justify-between shadow-lg"
            >
              {/* Channel Header */}
              <div className="text-center pb-2 border-b border-[#242838]">
                <h4 className="text-xs font-bold text-white truncate">{track.name}</h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  {track.type === 'video' ? 'AV Clip Audio' : 'Stereo Stem'}
                </span>
              </div>

              {/* Mute & Solo buttons */}
              <div className="flex gap-1.5 my-3">
                <button
                  onClick={() => onUpdateTrack(track.id, { muted: !track.muted })}
                  className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                    track.muted
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'border-[#2d3245] text-slate-400 hover:bg-[#202434]'
                  }`}
                >
                  MUTE
                </button>
                <button
                  onClick={() => onUpdateTrack(track.id, { solo: !track.solo })}
                  className={`flex-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                    track.solo
                      ? 'bg-amber-500 border-amber-400 text-black'
                      : 'border-[#2d3245] text-slate-400 hover:bg-[#202434]'
                  }`}
                >
                  SOLO
                </button>
              </div>

              {/* Pan Knob */}
              <div className="text-center my-2">
                <span className="text-[10px] text-slate-400 block mb-1">
                  Pan: {pan === 0 ? 'C' : pan < 0 ? `L ${Math.round(-pan * 100)}` : `R ${Math.round(pan * 100)}`}
                </span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={pan}
                  onChange={(e) => {
                    const newPan = parseFloat(e.target.value);
                    trackClips.forEach((c) => onUpdateClip(c.id, { pan: newPan }));
                  }}
                  className="w-24 h-1 bg-[#272b3c] rounded appearance-none cursor-pointer"
                />
              </div>

              {/* Fader & Stereo Level Meter */}
              <div className="flex-1 flex items-center justify-center gap-4 my-2">
                {/* Vertical Fader */}
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.02}
                  value={volume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    trackClips.forEach((c) => onUpdateClip(c.id, { volume: newVol }));
                  }}
                  className="h-36 -rotate-90 w-36 accent-emerald-500 cursor-pointer"
                />

                {/* Level Meter Bar */}
                <div className="w-3 h-36 bg-[#0f1118] border border-[#232737] rounded-sm p-0.5 flex flex-col justify-end overflow-hidden">
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 rounded-xs transition-all duration-75"
                    style={{
                      height: track.muted
                        ? '0%'
                        : `${dbToPercent(meterLevels.leftPeak - (track.type === 'audio' ? 0 : 4))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Fader dB readout */}
              <div className="text-center pt-2 border-t border-[#242838] font-mono text-[11px] text-slate-300">
                {volume === 0 ? '-inf dB' : `${(20 * Math.log10(volume)).toFixed(1)} dB`}
              </div>
            </div>
          );
        })}

        {/* Master Output Channel Strip */}
        <div className="w-44 bg-[#191c28] rounded-xl border border-blue-500/40 p-3 flex flex-col justify-between shadow-2xl">
          <div className="text-center pb-2 border-b border-[#2d3246]">
            <h4 className="text-xs font-bold text-blue-400">MASTER BUS</h4>
            <span className="text-[10px] text-slate-400 font-mono">Stereo LR Output</span>
          </div>

          <div className="my-3">
            <button
              onClick={toggleMasterMute}
              className={`w-full py-1 rounded text-[10px] font-bold border transition-colors ${
                masterMuted
                  ? 'bg-red-600 border-red-500 text-white'
                  : 'border-[#33384c] text-slate-300 hover:bg-[#25293a]'
              }`}
            >
              {masterMuted ? 'UNMUTE MASTER' : 'MUTE MASTER'}
            </button>
          </div>

          {/* Fader & Dual Stereo Meters */}
          <div className="flex-1 flex items-center justify-center gap-3 my-2">
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.02}
              value={masterVolume}
              onChange={(e) => handleMasterChange(parseFloat(e.target.value))}
              className="h-36 -rotate-90 w-36 accent-blue-500 cursor-pointer"
            />

            {/* Master Left and Right meters */}
            <div className="flex gap-1 h-36 bg-[#0c0e14] border border-[#2b3044] rounded p-0.5">
              <div className="w-2 h-full bg-[#161822] rounded-xs flex flex-col justify-end overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ height: `${dbToPercent(meterLevels.leftPeak)}%` }}
                />
              </div>
              <div className="w-2 h-full bg-[#161822] rounded-xs flex flex-col justify-end overflow-hidden">
                <div
                  className="w-full bg-gradient-to-t from-emerald-500 via-amber-400 to-red-500 transition-all duration-75"
                  style={{ height: `${dbToPercent(meterLevels.rightPeak)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="text-center pt-2 border-t border-[#2d3246] font-mono text-[11px] text-blue-400 font-semibold">
            {masterVolume === 0 ? '-inf dB' : `${(20 * Math.log10(masterVolume)).toFixed(1)} dB`}
          </div>
        </div>
      </div>
    </div>
  );
};
