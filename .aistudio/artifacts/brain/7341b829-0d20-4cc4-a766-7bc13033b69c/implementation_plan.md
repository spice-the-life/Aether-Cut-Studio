# Windows Desktop .exe Application & GitHub Release (Version 1.0)

Automates the packaging and release pipeline for **AetherCut Studio**, converting the professional web NLE into a native Windows `.exe` desktop application with automated GitHub Actions compilation for Version 1.0 (v1.0.0).

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed by the user:
> - **Packaging Mechanism**: GitHub Actions workflow (`.github/workflows/release-exe.yml`) that automatically compiles the React/Vite app with an Electron desktop wrapper on a `windows-latest` runner and publishes the installer executable directly to GitHub Releases.
> - **Release Name & Tag**: Version 1.0 (`v1.0.0`).
> - **Installer Format**: Standard Windows setup installer (`.exe`) via NSIS (`AetherCut-Studio-Setup-1.0.0.exe`) with desktop and start menu shortcuts.

---

## 1. Overview & Core Concept

- **What It Delivers**: A production-grade desktop packaging setup and GitHub CI/CD release pipeline that builds a native Windows executable (`.exe`) for AetherCut Studio. It includes an Electron desktop wrapper, custom application icon and window lifecycle controls, NSIS installer configuration, and a GitHub Actions workflow.
- **Target Audience / Persona**: Windows video editors and creators who want a dedicated offline desktop application running directly on their machine, without browser address bars or tab distractions.
- **Key Value**: Delivers the performance, native desktop ergonomics, and offline standalone executable file (`.exe`) expected of professional editing software.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **GitHub Repository Release Workflow**:
   - Pushing a git tag (e.g., `git tag v1.0.0 && git push origin v1.0.0`) or clicking **Run workflow** in GitHub Actions initiates the automated Windows runner.
   - The runner builds the optimized Vite client, launches `electron-builder`, packages the NSIS installer executable, and drafts a public GitHub Release titled **"Version 1.0"** with the downloadable `AetherCut-Studio-Setup-1.0.0.exe`.

2. **Windows Installation Experience**:
   - The user downloads `AetherCut-Studio-Setup-1.0.0.exe`.
   - Running the installer displays the AetherCut Studio setup wizard with custom app icon, license terms, install directory selector, and options for Desktop and Start Menu shortcuts.
   - Launching opens AetherCut Studio in a frameless native desktop window with hardware acceleration enabled for WebGL node graph rendering and smooth 60fps 4K video playback.

3. **In-App Desktop & GitHub Release Modal**:
   - In the top workstation toolbar next to the Share button, an **Install Desktop / GitHub Release** badge and modal gives users direct instructions, release notes for Version 1.0, and quick-copy terminal commands for publishing their repo to GitHub.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Electron Desktop Wrapper with electron-builder
- **Chosen Approach**: Use an Electron desktop shell (`electron/main.cjs` and `electron/preload.cjs`) packaged via `electron-builder` with an NSIS Windows target.
- **Why**: Electron provides native Windows integration, WebGL/Chromium hardware acceleration for video playback, and standard NSIS `.exe` installers out of the box with zero runtime prerequisites on user machines.
- **Alternatives Considered**: Tauri was considered, but requires users and GitHub Actions runners to install Rust/MSVC toolchains; Electron builds reliably in standard Node.js CI environments.

### Decision 2: Automated GitHub Actions CI/CD (`windows-latest`)
- **Chosen Approach**: A declarative GitHub Actions workflow (`.github/workflows/release-exe.yml`) executing on `windows-latest`.
- **Why**: Windows executables compiled on native Windows runners produce valid PE binary headers and authentic NSIS installers that run smoothly on Windows 10 and 11.

### Decision 3: In-App Desktop Information & Quick-Launch Panel
- **Chosen Approach**: Add a dedicated "Desktop App (Version 1.0)" modal in the workstation header with instructions, release notes, and build commands.
- **Why**: Ensures users working directly in the AI Studio environment understand exactly how to export, build, and distribute their `.exe` on GitHub.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│ GITHUB REPOSITORY & CI/CD PIPELINE                                     │
│                                                                        │
│   Push Tag: v1.0.0  ───►  GitHub Actions Runner (windows-latest)       │
│                                │                                       │
│                                ├──► npm ci & npm run build (Vite SPA)  │
│                                ├──► npx electron-builder --win nsis    │
│                                └──► GitHub Release: "Version 1.0"     │
│                                          │                             │
│                                          ▼                             │
│                       [AetherCut-Studio-Setup-1.0.0.exe]               │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WINDOWS DESKTOP APPLICATION ARCHITECTURE                              │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Electron Main Process (electron/main.cjs)                          │ │
│ │ ├── Native BrowserWindow (1440x900, dark titanium titlebar)        │ │
│ │ ├── Hardware acceleration (enable-gpu-rasterization, WebGL)        │ │
│ │ └── Application Menu (File, Edit, Timeline, View, Help)            │ │
│ └──────────────────────────────────┬─────────────────────────────────┘ │
│                                    │ Preload / IPC Bridge              │
│ ┌──────────────────────────────────▼─────────────────────────────────┐ │
│ │ React 19 + Vite Workstation UI                                     │ │
│ │ ├── Full Final Cut Pro Header & Central LCD Cockpit                │ │
│ │ ├── Event Browser & Dual Hero Video Viewer                         │ │
│ │ ├── Node Compositing Graph & Color Grading System                  │ │
│ │ └── Magnetic Timeline with Dual-Zone Waveform Rubberbands          │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Components to Create & Configure:

1. **`electron/main.cjs`**: Electron main process initializing a high-performance native window, enabling GPU acceleration, setting up macOS/Windows window controls, and serving the built Vite assets.
2. **`electron/preload.cjs`**: Secure preload script exposing desktop platform metadata (`isDesktop: true`, OS version) to the React application.
3. **`package.json` updates**:
   - Version set to `1.0.0`.
   - Build scripts: `"package:win": "npm run build && electron-builder --win nsis"`.
   - `build` configuration block defining `productName: "AetherCut Studio"`, `appId: "com.aethercut.studio"`, Windows target `nsis`, executable name `AetherCut-Studio-Setup-1.0.0.exe`, and standard desktop shortcuts.
4. **`.github/workflows/release-exe.yml`**: Full GitHub Actions workflow configuration ready to commit and push, triggered on tags `v*` and manual dispatch, automatically publishing the release.
5. **`src/components/header/WorkstationHeader.tsx` & Desktop Modal**: Adds a "Version 1.0 Desktop (.exe)" trigger button and informational modal with download instructions and setup guide.

---

## 5. Verification Plan

- Verify `package.json` contains valid version `1.0.0`, electron build scripts, and `electron-builder` configuration for Windows NSIS `.exe`.
- Verify `electron/main.cjs` and `electron/preload.cjs` are created with correct window initialization and file paths.
- Verify `.github/workflows/release-exe.yml` is syntactically valid YAML and configures `windows-latest` compilation.
- Verify the in-app Desktop modal opens and displays Version 1.0 release details and build instructions.
- Run `compile_applet` and `lint_applet` together to verify zero syntax or build errors.
