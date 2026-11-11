# AetherCut Studio

> **Professional Non-Linear Video Editor & VFX Node Compositing Workstation**  
> Inspired by Apple Final Cut Pro and DaVinci Resolve — built for high-performance creative editing.

---

## 💾 Official Downloads & Installers (Version 1.1)

Choose your preferred format below:

| Platform | Format | File | Status |
| :--- | :--- | :--- | :--- |
| **Windows 10 / 11 (x64)** | **`.exe` Installer** | [`AetherCut-Studio-Setup-1.1.0.exe`](Installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe) | **Latest Release (v1.1)** |
| **Windows 10 / 11** | **`.bat` 1-Click Runner** | [`AetherCut-Studio-Launcher.bat`](Installers/v1.1/AetherCut-Studio-Launcher.bat) | **Instant Launch (No Setup)** |
| **macOS (Universal)** | **`.dmg` Disk Image** | [`AetherCut-Studio-1.1.0.dmg`](Installers/v1.1/AetherCut-Studio-1.1.0.dmg) | **Apple Silicon & Intel** |
| **macOS (App Bundle)** | **`.app` Archive** | [`AetherCut-Studio-1.1.0-macOS.app.tar.gz`](Installers/v1.1/AetherCut-Studio-1.1.0-macOS.app.tar.gz) | **Standalone App** |
| **Multi-Platform** | **Complete Bundle** | [`AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz`](Installers/v1.1/AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz) | **All Installers** |

---

## 🚀 How to Download & Install on Windows

### Option A: Download the `.exe` from GitHub Releases (Recommended)
1. Go to the **[Releases](../../releases)** tab on the right side of this GitHub repository.
2. Under the **`v1.1.0`** release, click on **`AetherCut-Studio-Setup-1.1.0.exe`** under **Assets**.
3. Once downloaded, double-click the `.exe` file on your Windows PC.
4. Follow the setup wizard to create your Desktop and Start Menu shortcuts.
5. Launch **AetherCut Studio**!

### Option B: Download from Repository Files
1. Navigate to the [`Installers/v1.1/`](Installers/v1.1/) folder in this repository.
2. Click on [`AetherCut-Studio-Setup-1.1.0.exe`](Installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe).
3. Click the **Download** (⬇️) button on GitHub to save it to your PC.

### Option C: 1-Click Instant Desktop Launcher (`.bat`)
1. Download [`AetherCut-Studio-Launcher.bat`](Installers/v1.1/AetherCut-Studio-Launcher.bat).
2. Move it to your Desktop and double-click it.
3. Launches AetherCut Studio immediately in a dedicated, frameless desktop window at 60fps with full GPU acceleration.

---

## ⚡ Automated GitHub Actions `.exe` Build Pipeline

This repository includes a pre-configured CI/CD workflow at [`.github/workflows/release-exe.yml`](.github/workflows/release-exe.yml).

### How to trigger a new `.exe` build on GitHub:
1. Go to the **Actions** tab on your GitHub repository.
2. Select **Build & Release Windows .exe (Version 1.1)** on the left menu.
3. Click **Run workflow** ➔ select branch `main` ➔ click **Run workflow**.
4. GitHub will automatically spin up a genuine Microsoft Windows VM (`windows-latest`), compile the complete desktop application, package the NSIS `.exe` installer, and publish it under **Releases**!

---

## 🛠 Local Development & Packaging

```bash
# Install dependencies
npm install

# Start local dev workstation (Port 3000)
npm run dev

# Build client production bundle
npm run build

# Package Windows NSIS .exe installer locally
npm run package:win
```

---

## ✨ Features

- **Apple Final Cut Pro Aesthetic**: Dark titanium theme, authentic traffic light controls, and center LCD timecode cockpit.
- **Dual-Zone Magnetic & Traditional Timeline**: Video filmstrips with high-fidelity audio waveforms and draggable volume rubberbands.
- **Visual Node Compositing Graph**: Full node-based VFX pipeline with chroma keying, color grading, blur, and film grain nodes.
- **Hardware-Accelerated WebGL Engine**: 60fps real-time preview and multi-track compositing.
