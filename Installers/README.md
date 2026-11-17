# AetherCut Studio - Official Installers

This directory contains official desktop installers and application packages for **AetherCut Studio** (hosted on GitHub).

---

## Directory Structure

```
Installers/
├── v1.3/                                          # Version 1.3 (Latest Release)
│   ├── AetherCut-Studio-Setup-1.3.0.exe           # Windows 10/11 x64 Native Setup Installer
│   ├── AetherCut-Studio-Launcher.bat              # Windows 1-Click Instant Desktop Launcher
│   ├── AetherCut-Studio-1.3.0.dmg                 # macOS Universal Disk Image Installer
│   ├── AetherCut Studio.app/                      # macOS Uncompressed Application Bundle
│   ├── AetherCut-Studio-1.3.0-macOS.app.tar.gz    # macOS Application Bundle Archive
│   └── AetherCut-Studio-v1.3.0-Complete-Installers.tar.gz # All-in-One Complete Bundle Archive
│
├── v1.2/                                          # Version 1.2 (Previous Release)
├── v1.1/                                          # Version 1.1
├── v1.0/                                          # Version 1.0 (Stable)
├── v0.9-beta/                                     # Version 0.9 (Beta Release)
└── README.md                                      # Installer guide
```

---

## Installation Instructions

### Windows (10 / 11 64-bit)
**Option A — Setup Installer (.exe)**:
1. Download `Installers/v1.3/AetherCut-Studio-Setup-1.3.0.exe` from GitHub.
2. Follow the setup prompts to create your Desktop & Start Menu shortcuts.
3. Launch **AetherCut Studio**.

**Option B — 1-Click Desktop Runner (.bat)**:
1. Double-click `Installers/v1.3/AetherCut-Studio-Launcher.bat`.
2. Instantly opens AetherCut Studio in a dedicated standalone app window.

### macOS
**Option A — Disk Image (.dmg)**:
1. Open `Installers/v1.3/AetherCut-Studio-1.3.0.dmg`.
2. Drag `AetherCut Studio.app` into your `Applications` folder.

**Option B — Standalone Application Bundle (.app)**:
1. Extract or copy `AetherCut Studio.app` into `/Applications`.
2. Launch directly from Launchpad or Finder.

---

## Automated GitHub Releases
Any commit or tag pushed as `v1.3.0` triggers the automated GitHub Actions workflow (`.github/workflows/release-exe.yml`), compiling the Windows executable on `windows-latest` and publishing the release assets directly to GitHub.
