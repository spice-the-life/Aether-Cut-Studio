# AetherCut Studio Version 1.1 Release (.dmg, .app, .exe & Complete Bundle)

Deliver the new **Version 1.1 (v1.1.0)** multi-platform release of AetherCut Studio, featuring native installers for **Windows (.exe)**, **macOS Disk Image (.dmg)**, **macOS Application Bundle (.app)**, and a **Complete All-in-One Bundle Archive**, alongside updated in-app download and CI/CD configurations.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed by user clarification:
> - **Release Version**: **Version 1.1 (`v1.1.0`)**.
> - **Installer Formats**:
>   1. **`.exe`**: `AetherCut-Studio-Setup-1.1.0.exe` (Windows 10/11 x64 NSIS setup installer).
>   2. **`.dmg`**: `AetherCut-Studio-1.1.0.dmg` (macOS Universal disk image).
>   3. **`.app`**: `AetherCut Studio.app` (macOS Application Bundle with updated `Info.plist` v1.1.0 and executable launcher).
>   4. **Complete Bundle Archive**: `AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz` packaging all three installers into a single all-in-one download.
> - **In-App Installers Browser**: Updated to feature Version 1.1 as the active hero release with instant 1-click downloads for each format and the complete bundle.

---

## 1. Overview & Core Concept

- **What It Delivers**:
  - A new `Installers/v1.1/` release directory containing:
    - `AetherCut-Studio-Setup-1.1.0.exe`
    - `AetherCut-Studio-1.1.0.dmg`
    - `AetherCut Studio.app/` (with `Contents/Info.plist` version 1.1.0 and `MacOS/AetherCut Studio` launcher)
    - `AetherCut-Studio-1.1.0-macOS.app.tar.gz`
    - `AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz` (Complete bundle containing .exe, .dmg, and .app)
  - Public web assets under `public/installers/v1.1/` for direct in-browser 1-click downloads.
  - Updated `package.json` bumped to version `1.1.0`.
  - Updated in-app **Installers & Releases** browser displaying Version 1.1 as the primary release, with filters for Windows, macOS, and Complete Bundle.
- **Target Audience**: Creators on Windows and macOS seeking the newest Version 1.1 desktop release.
- **Key Value**: Simplifies distribution with direct access to `.dmg`, `.app`, and `.exe` binaries plus a single consolidated download bundle.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Toolbar Quick Access**:
   - The top toolbar displays the **Installers** button alongside an updated **v1.1 Release** indicator.
2. **In-App Download Browser (Version 1.1 Featured)**:
   - When the user opens the modal, **Version 1.1 (Latest Release)** is pinned at the top with:
     - 🪟 `AetherCut-Studio-Setup-1.1.0.exe` (Download .exe button)
     -  `AetherCut-Studio-1.1.0.dmg` (Download .dmg button)
     -  `AetherCut Studio.app` (Download .app Bundle button)
     - 📦 `AetherCut-Studio-v1.1.0-Complete-Bundle` (Download All button)
   - Platform filters allow switching between **All**, **Windows**, and **macOS**.
   - Historical versions (v1.0 and v0.9 Beta) remain accessible in the version selector.
3. **Local File & Git Repository Access**:
   - Files are stored in `/Installers/v1.1/` with a clean `README.md` and direct path copy buttons.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Version 1.1 Release Directory & Public Mirroring
- **Chosen Approach**: Place Version 1.1 assets in `Installers/v1.1/` and mirror download files into `public/installers/v1.1/`.
- **Why**: Allows instant browser-initiated file downloads without requiring external cloud hosting or authentication, while maintaining clean repository structure for git users.

### Decision 2: All-in-One Complete Bundle Archive
- **Chosen Approach**: Generate `AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz` grouping the `.exe`, `.dmg`, and `.app` bundle.
- **Why**: Provides cross-platform teams and power users a single download containing all deployment targets.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│ INSTALLERS REPOSITORY (VERSION 1.1)                                    │
│                                                                        │
│ 📁 /Installers                                                         │
│    ├── 📁 v1.1/                                  ◄── NEW RELEASE       │
│    │   ├── 📄 AetherCut-Studio-Setup-1.1.0.exe   (Windows x64 Setup)   │
│    │   ├── 📄 AetherCut-Studio-1.1.0.dmg         (macOS Disk Image)    │
│    │   ├── 📁 AetherCut Studio.app/              (macOS App Bundle)    │
│    │   │   └── 📁 Contents/                                            │
│    │   │       ├── 📄 Info.plist (v1.1.0)                              │
│    │   │       └── 📁 MacOS/AetherCut Studio                           │
│    │   ├── 📄 AetherCut-Studio-1.1.0-macOS.app.tar.gz                  │
│    │   └── 📦 AetherCut-Studio-v1.1.0-Complete-Installers.tar.gz       │
│    ├── 📁 v1.0/                                                        │
│    └── 📁 v0.9-beta/                                                   │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ IN-APP INSTALLERS MODAL (v1.1 HERO)                                    │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Header: Installers & Releases (Version 1.1 Latest)                 │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Filters: [ All ]  [ ⊞ Windows (.exe) ]  [  macOS (.app & .dmg) ]  │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ 🌟 Version 1.1 (Latest Release)                                    │ │
│ │    • AetherCut-Studio-Setup-1.1.0.exe       [ Download .exe ]      │ │
│ │    • AetherCut-Studio-1.1.0.dmg             [ Download .dmg ]      │ │
│ │    • AetherCut Studio.app (Bundle)          [ Download .app ]      │ │
│ │    • Complete All-in-One Package            [ Download All ]       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Plan

1. Create `Installers/v1.1/` with the `.exe`, `.dmg`, `.app` bundle (with Info.plist v1.1.0), and complete bundle archive.
2. Mirror files to `public/installers/v1.1/` for 1-click in-browser downloads.
3. Update `package.json` version to `1.1.0`.
4. Update `InstallersModal.tsx` and `WorkstationHeader.tsx` to feature Version 1.1 and test downloads.
5. Run `compile_applet` and `lint_applet` together to verify 0 errors.
