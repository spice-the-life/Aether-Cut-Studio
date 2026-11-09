# Installers Repository & Multi-Platform Download Portal (Windows .exe & macOS .app)

Create a dedicated `Installers/` directory containing native installation packages for **Windows (.exe)** and **macOS (.app & .dmg)** across **Version 1.0** and **Version 0.9 Beta**, complete with an in-app 1-click Installers & Releases download browser.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed by the user:
> - **Installer Versions**: Both **Version 1.0 Release** (Latest Stable) and **Version 0.9 Beta** builds.
> - **macOS Package Format**: Complete macOS application bundle directory (`AetherCut Studio.app`) with `Contents/Info.plist` and executable launcher, alongside the standard `.dmg` disk image installer.
> - **In-App Installers Browser**: An interactive, full-featured "Installers & Releases" browser with 1-click downloads, version switching, platform filters, and checksums.

---

## 1. Overview & Core Concept

- **What It Delivers**:
  1. A root-level `Installers/` repository directory structured by version (`v1.0` and `v0.9-beta`) housing:
     - `Installers/v1.0/AetherCut-Studio-Setup-1.0.0.exe` (Windows x64 installer)
     - `Installers/v1.0/AetherCut-Studio-1.0.0.dmg` (macOS Apple Silicon & Intel installer)
     - `Installers/v1.0/AetherCut Studio.app/` (macOS Application Bundle with `Info.plist`, `MacOS/AetherCut Studio`, and `Resources`)
     - `Installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.exe` (Windows Beta)
     - `Installers/v0.9-beta/AetherCut-Studio-Beta-0.9.0.dmg` (macOS Beta)
     - `Installers/README.md` (System requirements, verification checksums, and deployment guide)
  2. A public distribution directory (`public/installers/`) enabling real in-browser 1-click downloads of installers and bundles.
  3. An in-app **"Installers & Releases"** modal dialog accessible directly from the top toolbar, offering instant downloads, platform filters (Windows / macOS), and version history.
- **Target Audience**: Windows and macOS video editors needing offline installable packages for stable production work or beta testing.
- **Key Value**: Provides immediate access to download ready-to-run `.exe`, `.dmg`, and `.app` bundles directly from the application and repository.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Top Toolbar "Installers" Access**:
   - In the top workstation toolbar (next to Share), a dedicated **"Installers"** button (with Windows & Apple icons) opens the modal.
2. **Browsing & Downloading Installers**:
   - The user can toggle between:
     - **Windows (.exe)**: Direct download for `AetherCut-Studio-Setup-1.0.0.exe` (Version 1.0) and `AetherCut-Studio-Beta-0.9.0.exe`.
     - **macOS (.app & .dmg)**: Direct download for `AetherCut-Studio-1.0.0.dmg` and the standalone `AetherCut Studio.app.zip` bundle.
     - **All Versions**: Side-by-side comparison of Version 1.0 Stable vs. Version 0.9 Beta.
   - Clicking **"Download .exe"** or **"Download .dmg / .app"** generates and triggers the instant browser file download.
3. **Repository Directory Inspection**:
   - Developers and GitHub users cloning or browsing the repo can navigate directly into `/Installers/v1.0/` or `/Installers/v0.9-beta/` to access the binaries and the `.app` macOS bundle.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Complete macOS .app Bundle Structure & .dmg
- **Chosen Approach**: Build a valid macOS Application Bundle (`AetherCut Studio.app/Contents/Info.plist`, `Contents/MacOS/`, `Contents/Resources/`) and a `.dmg` installer.
- **Why**: Satisfies standard macOS app conventions (`CFBundleIdentifier`, `CFBundleExecutable`, `LSMinimumSystemVersion`), allowing macOS users to drag the `.app` straight into `/Applications`.

### Decision 2: Dual Distribution (Repository `Installers/` + In-App `public/installers/`)
- **Chosen Approach**: Place files in both `Installers/` for git/offline repository access and `public/installers/` so the web preview UI can serve real direct downloads without needing an external cloud bucket.
- **Why**: Guarantees that clicking download buttons in the browser works immediately for the user right now, while also keeping the repository organized for GitHub releases.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│ INSTALLERS DIRECTORY STRUCTURE                                         │
│                                                                        │
│ 📁 /Installers                                                         │
│    ├── 📁 v1.0/                                                        │
│    │   ├── 📄 AetherCut-Studio-Setup-1.0.0.exe   (Windows x64 Setup)   │
│    │   ├── 📄 AetherCut-Studio-1.0.0.dmg         (macOS Disk Image)    │
│    │   └── 📁 AetherCut Studio.app/              (macOS App Bundle)    │
│    │       └── 📁 Contents/                                            │
│    │           ├── 📄 Info.plist                                       │
│    │           ├── 📁 MacOS/AetherCut Studio                           │
│    │           └── 📁 Resources/                                       │
│    ├── 📁 v0.9-beta/                                                   │
│    │   ├── 📄 AetherCut-Studio-Beta-0.9.0.exe   (Windows Beta)         │
│    │   └── 📄 AetherCut-Studio-Beta-0.9.0.dmg   (macOS Beta)           │
│    └── 📄 README.md                              (Hashes & Guide)      │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ IN-APP INSTALLERS DOWNLOAD MODAL                                       │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Header: Installers & Release Packages (v1.0 & v0.9 Beta)           │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Platform Filter: [ All ]  [ ⊞ Windows (.exe) ]  [  macOS (.app) ]  │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🟢 Version 1.0 (Latest Stable)                                 │ │ │
│ │ │    • AetherCut-Studio-Setup-1.0.0.exe  [ Download .exe ]       │ │ │
│ │ │    • AetherCut-Studio-1.0.0.dmg        [ Download .dmg ]       │ │ │
│ │ │    • AetherCut Studio.app              [ Download .app Bundle] │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ 🟡 Version 0.9 (Beta Release)                                  │ │ │
│ │ │    • AetherCut-Studio-Beta-0.9.0.exe   [ Download .exe ]       │ │ │
│ │ │    • AetherCut-Studio-Beta-0.9.0.dmg   [ Download .dmg ]       │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Plan

1. Create `Installers/v1.0/` and `Installers/v0.9-beta/` directories with executable packages and the macOS `.app` bundle structure.
2. Mirror download packages into `public/installers/` for browser-accessible downloads.
3. Build `InstallersModal.tsx` and integrate it into `WorkstationHeader.tsx` and `App.tsx`.
4. Test clicking download buttons for both Windows `.exe` and macOS `.app`/`.dmg` to ensure clean file downloads.
5. Run `compile_applet` and `lint_applet` together to verify 0 errors.
