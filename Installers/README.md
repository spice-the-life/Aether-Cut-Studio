# AetherCut Studio - Official Installers

This directory contains official desktop installers and application packages for **AetherCut Studio**.

---

## Directory Structure

```
Installers/
├── v1.1/                                          # Version 1.1 (Latest Release)
│   ├── AetherCut-Studio-Setup-1.1.0.exe           # Windows 10/11 x64 NSIS Setup Installer
│   ├── AetherCut-Studio-1.1.0.dmg                 # macOS Universal Disk Image Installer
│   ├── AetherCut Studio.app/                      # macOS Uncompressed Application Bundle
│   ├── AetherCut-Studio-1.1.0-macOS.app.tar.gz    # macOS Application Bundle Archive
│   └── AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz # All-in-One Complete Bundle Archive
│
├── v1.0/                                          # Version 1.0 (Previous Stable)
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
1. Download or open `Installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe`.
2. Follow the NSIS setup wizard prompts.
3. Choose your installation folder and toggle Desktop / Start Menu shortcuts.
4. Launch **AetherCut Studio** from your Start Menu or Desktop shortcut.

###  macOS (macOS 11 Big Sur, Monterey, Ventura, Sonoma, Sequoia)
**Option A — Disk Image (.dmg)**:
1. Open `Installers/v1.1/AetherCut-Studio-1.1.0.dmg`.
2. Drag `AetherCut Studio.app` into your `Applications` folder.

**Option B — Standalone Application Bundle (.app)**:
1. Extract or copy `AetherCut Studio.app` into `/Applications`.
2. Launch directly from Launchpad or Finder.

**Option C — Complete Multi-Platform Bundle**:
- Download `AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz` for all installers in a single archive.

---

## Automated GitHub Releases
Any commit or tag pushed as `v1.1.0` triggers the automated GitHub Actions workflow (`.github/workflows/release-exe.yml`), compiling the Windows executable on `windows-latest` and publishing the release assets directly to GitHub.
