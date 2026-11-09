# AetherCut Studio - Official Installers

This directory contains official desktop installers and application packages for **AetherCut Studio**.

---

## Directory Structure

```
Installers/
├── v1.0/                                    # Version 1.0 (Latest Stable Release)
│   ├── AetherCut-Studio-Setup-1.0.0.exe     # Windows 10/11 x64 NSIS Setup Installer
│   ├── AetherCut-Studio-1.0.0.dmg           # macOS Universal Disk Image
│   ├── AetherCut-Studio-1.0.0-macOS.app.tar.gz # macOS Application Bundle Archive
│   └── AetherCut Studio.app/                # macOS Uncompressed Application Bundle
│       └── Contents/
│           ├── Info.plist
│           └── MacOS/AetherCut Studio
│
├── v0.9-beta/                               # Version 0.9 (Beta Release)
│   ├── AetherCut-Studio-Beta-0.9.0.exe      # Windows 10/11 x64 Beta Installer
│   └── AetherCut-Studio-Beta-0.9.0.dmg      # macOS Beta Disk Image
│
└── README.md                                # Installer guide & checksums
```

---

## Installation Instructions

### 🪟 Windows (10 / 11 64-bit)
1. Download or open `Installers/v1.0/AetherCut-Studio-Setup-1.0.0.exe`.
2. Follow the NSIS setup wizard prompts.
3. Choose your installation folder and toggle Desktop / Start Menu shortcuts.
4. Launch **AetherCut Studio** from your Start Menu or Desktop shortcut.

###  macOS (macOS 11 Big Sur, Monterey, Ventura, Sonoma, Sequoia)
**Option A — Disk Image (.dmg)**:
1. Open `Installers/v1.0/AetherCut-Studio-1.0.0.dmg`.
2. Drag `AetherCut Studio.app` into your `Applications` folder.

**Option B — Standalone Application Bundle (.app)**:
1. Copy or extract `AetherCut Studio.app` into `/Applications`.
2. Launch directly from Launchpad or Finder.

---

## Automated GitHub Releases
Any commit tagged with `v1.0.0` or `v0.9.*` automatically triggers the GitHub Actions workflow (`.github/workflows/release-exe.yml`), compiling clean executables on native `windows-latest` and publishing them to your repository's Releases page.
