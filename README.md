# AetherCut Studio

> **Professional Non-Linear Video Editor & VFX Node Compositing Workstation**  
> Inspired by Apple Final Cut Pro and DaVinci Resolve — built for high-performance creative editing.

---

## 💾 Official Downloads & Installers (Version 1.3 · Latest Release)

Choose your preferred format below (desktop installers are hosted exclusively on GitHub):

| Platform | Format | File | Status |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11 (x64)** | **`.exe` Installer** | [`AetherCut-Studio-Setup-1.3.0.exe`](Installers/v1.3/AetherCut-Studio-Setup-1.3.0.exe) | **Latest Release (v1.3)** |
| **Windows 10 / 11** | **`.bat` 1-Click Runner** | [`AetherCut-Studio-Launcher.bat`](Installers/v1.3/AetherCut-Studio-Launcher.bat) | **Instant Launch (No Setup)** |
| **macOS (Universal)** | **`.dmg` Disk Image** | [`AetherCut-Studio-1.3.0.dmg`](Installers/v1.3/AetherCut-Studio-1.3.0.dmg) | **Apple Silicon & Intel** |
| **macOS (App Bundle)** | **`.app` Archive** | [`AetherCut-Studio-1.3.0-macOS.app.tar.gz`](Installers/v1.3/AetherCut-Studio-1.3.0-macOS.app.tar.gz) | **Standalone App** |
| **Multi-Platform** | **Complete Bundle** | [`AetherCut-Studio-v1.3.0-Complete-Installers.tar.gz`](Installers/v1.3/AetherCut-Studio-v1.3.0-Complete-Installers.tar.gz) | **All Installers** |

---

## 🚀 How to Download & Install on Windows

### Option A: Download the `.exe` from GitHub Releases (Recommended)
1. Go to the **[Releases](../../releases)** tab on the right side of this GitHub repository.
2. Under the **`v1.3.0`** release, click on **`AetherCut-Studio-Setup-1.3.0.exe`** under **Assets**.
3. Once downloaded, double-click the `.exe` file on your Windows PC.
4. Follow the setup wizard to create your Desktop and Start Menu shortcuts.
5. Launch **AetherCut Studio**!

### Option B: Download from Repository Files
1. Navigate to the [`Installers/v1.3/`](Installers/v1.3/) folder in this repository.
2. Click on [`AetherCut-Studio-Setup-1.3.0.exe`](Installers/v1.3/AetherCut-Studio-Setup-1.3.0.exe).
3. Click the **Download** button on GitHub to save it to your PC.

### Option C: 1-Click Instant Desktop Launcher (`.bat`)
1. Download [`AetherCut-Studio-Launcher.bat`](Installers/v1.3/AetherCut-Studio-Launcher.bat).
2. Move it to your Desktop and double-click it.
3. Launches AetherCut Studio immediately in a dedicated, frameless desktop window at 60fps with full GPU acceleration.

---

## ⚡ Automated GitHub Actions `.exe` Build Pipeline

This repository includes an automated CI/CD workflow at [`.github/workflows/release-exe.yml`](.github/workflows/release-exe.yml).

### How to trigger a new `.exe` build on GitHub:
1. Go to the **Actions** tab on your GitHub repository.
2. Select **Build & Release Windows .exe (Version 1.3)** on the left menu.
3. Click **Run workflow** ➔ select branch `main` ➔ click **Run workflow**.
4. GitHub automatically spins up a Microsoft Windows VM (`windows-latest`), compiles the complete desktop application, packages the `.exe` installer, and publishes it under **Releases**!

---

## 🛠 Local Development & Packaging

```bash
# Install dependencies
npm install

# Start local dev workstation (Port 3000)
npm run dev

# Type-check with TypeScript
npm run lint

# Build client production bundle
npm run build

# Start production server (Port 3000)
npm start

# Package Windows NSIS .exe installer locally
npm run package:win
```

---

## ✨ Features (Version 1.3)

- **AI Voiceover Studio**: Generate spoken audio from custom scripts or `S1` captions using 5 AI voices (`Puck`, `Charon`, `Kore`, `Fenrir`, `Zephyr`), 6 vocal styles (`Natural`, `Energetic`, `Calm`, `Dramatic`, `Robotic`, `Narrator`), speed & pitch controls, and multi-speaker character casts. Automatically inserts per-sentence clips onto `A1`/`A2`, synchronizes `S1` subtitles to audio timing, and supports single-sentence regeneration.
- **Subtitles & AI Captions Studio (`S1`)**: Five-tab workspace (`SRT Editor`, `AI Subtitles`, `AI Voiceover`, `Subtitle Styling`, `Speaker Management`) with `.srt` import/export, timeline cue dragging/trimming, Gemini audio & script transcription, and customizable burn-in styling.
- **1080p / 4K Export with Audio & Subtitles**: Native-resolution frame rendering with 48kHz stereo offline Web Audio mixdown (`OfflineAudioContext`) muxed into exported video alongside scaled burn-in captions.
- **Project Reliability & Undo/Redo**: Full `.aethercut.json` project save/load with embedded media and voiceover sentence rehydration, IndexedDB autosave, and coalesced multi-step Undo/Redo across editing, track controls, and AI operations.
- **Apple Final Cut Pro Aesthetic & Node VFX**: Dark titanium workstation, dual-zone magnetic/traditional timeline with waveform & trim handles, workspace layout persistence, and a visual node compositing graph with chroma keying, color grading, blur, and film grain.
