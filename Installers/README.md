# AetherCut Studio - Official Installers

This directory contains official desktop installers and application packages for **AetherCut Studio**.

---

## Directory Structure

```
Installers/
├── v1.2/                                          # Version 1.2 (Latest Release)
│   ├── AetherCut-Studio-Setup-1.2.0.exe           # Windows 10/11 x64 Native Setup Installer
│   ├── AetherCut-Studio-Launcher.bat              # Windows 1-Click Instant Desktop Launcher
│   ├── AetherCut-Studio-1.2.0.dmg                 # macOS Universal Disk Image Installer
│   ├── AetherCut Studio.app/                      # macOS Uncompressed Application Bundle
│   ├── AetherCut-Studio-1.2.0-macOS.app.tar.gz    # macOS Application Bundle Archive
│   └── AetherCut-Studio-v1.2.0-Complete-Installers.tar.gz # All-in-One Complete Bundle Archive
│
├── v1.1/                                          # Version 1.1 (Previous Release)
│   ├── AetherCut-Studio-Setup-1.1.0.exe
│   ├── AetherCut-Studio-Launcher.bat
│   ├── AetherCut-Studio-1.1.0.dmg
│   └── AetherCut Studio.app/
│
├── v1.0/                                          # Version 1.0 (Stable)
│   ├── AetherCut-Studio-Setup-1.0.0.exe
│   ├── AetherCut-Studio-1.0.0.dmg
│   └── AetherCut Studio.app/
│
├── v0.9-beta/                                     # Version 0.9 (Beta Release)
│   ├── AetherCut-Studio-Beta-0.9.0.exe
│   └── AetherCut-Studio-Beta-0.9.0.dmg
│
└── README.md                                      # Installer guide & checksums
```

---

## Installation Instructions

### 🪟 Windows (10 / 11 64-bit)
**Option A — Setup Installer (.exe)**:
1. Download or open `Installers/v1.2/AetherCut-Studio-Setup-1.2.0.exe`.
2. Follow the setup prompts to create your Desktop & Start Menu shortcuts.
3. Launch **AetherCut Studio**.

**Option B — 1-Click Desktop Runner (.bat)**:
1. Double-click `Installers/v1.2/AetherCut-Studio-Launcher.bat`.
2. Instantly opens AetherCut Studio in a dedicated standalone app window.

###  macOS (macOS 11 Big Sur, Monterey, Ventura, Sonoma, Sequoia)
**Option A — Disk Image (.dmg)**:
1. Open `Installers/v1.2/AetherCut-Studio-1.2.0.dmg`.
2. Drag `AetherCut Studio.app` into your `Applications` folder.

**Option B — Standalone Application Bundle (.app)**:
1. Extract or copy `AetherCut Studio.app` into `/Applications`.
2. Launch directly from Launchpad or Finder.

**Option C — Complete Multi-Platform Bundle**:
- Download `AetherCut-Studio-v1.2.0-Complete-Installers.tar.gz` for all installers in a single archive.

---

## Automated GitHub Releases
Any commit or tag pushed as `v1.2.0` triggers the automated GitHub Actions workflow (`.github/workflows/release-exe.yml`), compiling the Windows executable on `windows-latest` and publishing the release assets directly to GitHub.
