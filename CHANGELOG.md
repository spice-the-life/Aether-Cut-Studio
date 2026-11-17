# Changelog

All notable changes to **AetherCut Studio** are documented in this file.

## [1.3.0] — Latest Release

### Added
- **AI Voiceover Studio** inside Subtitles & AI Captions Studio (`SRT Editor`, `AI Subtitles`, `AI Voiceover`, `Subtitle Styling`, `Speaker Management`):
  - Generate Text-to-Speech narration from a custom script or loaded `S1` subtitles.
  - 5 selectable AI voices (`Puck`, `Charon`, `Kore`, `Fenrir`, `Zephyr`) and 6 vocal styles (`Natural`, `Energetic`, `Calm`, `Dramatic`, `Robotic`, `Narrator`).
  - Adjustable speaking speed and pitch controls plus multi-speaker character cast assignment (`Speaker Management`).
  - Automatic per-sentence clip insertion onto timeline audio tracks (`A1` / `A2`) with synchronized `S1` subtitle timing.
  - Single-sentence regeneration without re-generating the entire voiceover take.
- **1080p / 4K Audio + Subtitle Export**:
  - Native target-resolution frame rendering (`renderFrameAtTime`) with scaled burn-in subtitles.
  - 48kHz stereo offline Web Audio mixdown (`OfflineAudioContext`) muxed into exported video, including procedural synth cues, track mute/solo handling, and cancellation support.

### Improved
- **Timeline Visual & Editing Polish**:
  - Selected-track highlighting, track-height drag + header width resize grip, clip hover/selection states, prominent clip edge trim handles, clearer waveforms, empty-track guidance, and corner monitor HUD.
  - Grouped compact timeline toolbar separating editing tools from AI tools with clearer active states and tooltips.
- **Reliability & Persistence**:
  - Coalesced multi-step Undo/Redo across clip edits, sliders, track mute/lock/solo, subtitles, and AI operations.
  - `.aethercut.json` project bundle save/load rehydrating media, waveforms, and voiceover sentence states cleanly without stale `blob:` URLs.
  - Workspace panel resizing persistence and non-blocking error toast notifications.

### Fixed
- `/api/ai/tts` WAV container validation and RIFF header construction when raw PCM streams are returned.
- Sub-second audio voiceover clip duration preservation during media registration and project reload.
- Synchronized desktop wrapper versions (`electron/`, `scripts/sea-entry.js`, macOS `.app` launcher) to `1.3.0`.
