# Genuine Windows NSIS Setup Wizard Installer (.exe) Compilation

Fixes the Windows *"This app can't run on your PC"* error by generating a genuine, fully valid 64-bit Windows Portable Executable (PE32+) NSIS setup installer (`AetherCut-Studio-Setup-1.1.0.exe`) directly in the application.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed by user clarification:
> - **Delivery Method**: Compile a real, native Windows executable directly in the application (rather than relying solely on remote GitHub Actions runners).
> - **Installer Type**: Full NSIS Windows Setup Wizard Installer (`.exe`) with installation directory selector, Start Menu / Desktop shortcuts, and uninstaller.
> - **Root Cause Diagnosis**: The previous file was a non-executable preview stub lacking valid Windows PE COFF headers, machine architecture tags (`IMAGE_FILE_MACHINE_AMD64`), and section tables, causing the Windows kernel loader to reject it with *"This app can't run on your PC"*.

---

## 1. Overview & Core Concept

- **The Problem**: When Windows attempts to execute a file ending in `.exe`, its kernel loader (`ntoskrnl.exe` / `ntdll.dll`) inspects the DOS header (`MZ`), the PE signature pointer (`e_lfanew`), the COFF File Header (`0x8664` for x64), the Optional Header (magic `0x020B` for PE32+, Subsystem `IMAGE_SUBSYSTEM_WINDOWS_GUI`), and valid Section Tables (`.text`, `.rdata`, `.data`, `.rsrc`). Because the previous file was a placeholder stub without these structures, Windows displayed *"This app can't run on your PC"*.
- **The Solution**: 
  1. Compile a genuine 64-bit Windows Portable Executable (PE32+) NSIS installer binary with proper COFF headers, section alignments, entry point, and embedded self-extracting runtime.
  2. Structure the installer with the standard NSIS header and payload containing the built Vite application, the Electron runtime scripts, and automated desktop shortcut creation.
  3. Update both `Installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe` and `public/installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe` so the 1-click download button in the app provides the valid, runnable executable.
  4. Include a companion `AetherCut-Studio-Setup.cmd` 1-click launcher in the Complete Bundle as an immediate fail-safe.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Downloading the Installer**:
   - The user opens the in-app **v1.1 Installers** browser from the top toolbar.
   - Clicking **Download .exe** delivers the compiled 64-bit `AetherCut-Studio-Setup-1.1.0.exe`.
2. **Running on Windows 10 / 11**:
   - Double-clicking the `.exe` no longer shows *"This app can't run on your PC"*.
   - The Windows OS recognizes the valid PE32+ signature and launches the **AetherCut Studio Setup Wizard**:
     - *Welcome Screen*: Displays AetherCut Studio Version 1.1 branding.
     - *Directory Selection*: Defaults to `C:\Program Files\AetherCut Studio`.
     - *Shortcuts*: Creates Desktop shortcut and Start Menu folder.
     - *Installation Progress*: Extracts files cleanly and offers a checkbox to "Launch AetherCut Studio".
3. **Running the Installed App**:
   - Launches AetherCut Studio in a dedicated hardware-accelerated desktop window.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Genuine 64-bit PE32+ NSIS Installer Architecture
- **Chosen Approach**: Build a fully compliant Windows PE32+ binary with standard DOS stub, valid NT headers (`IMAGE_NT_SIGNATURE`), 64-bit AMD64 architecture flag (`0x8664`), GUI Subsystem (`0x0002`), and valid NSIS data blocks.
- **Why**: Ensures 100% binary compatibility with Windows 10 and Windows 11 kernel loaders, permanently resolving the "can't run on your PC" failure.

### Decision 2: Dual Distribution & Public Mirroring
- **Chosen Approach**: Overwrite both `Installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe` and `public/installers/v1.1/AetherCut-Studio-Setup-1.1.0.exe`, plus update the all-in-one Complete Bundle archive.
- **Why**: Guarantees that downloading from either the web UI button or checking out the git repository delivers the working installer.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│ WINDOWS PE32+ BINARY STRUCTURE (AetherCut-Studio-Setup-1.1.0.exe)       │
│                                                                        │
│ 0x0000 ┌─────────────────────────────────────────────────────────────┐ │
│        │ IMAGE_DOS_HEADER (e_magic: 'MZ', e_lfanew: 0x80)            │ │
│ 0x0040 │ MS-DOS Stub ("This program cannot be run in DOS mode.")     │ │
│ 0x0080 ├─────────────────────────────────────────────────────────────┤ │
│        │ IMAGE_NT_HEADERS ('PE\0\0')                                 │ │
│        │ ├── IMAGE_FILE_HEADER (Machine: 0x8664 AMD64, Sections: 4)  │ │
│        │ └── IMAGE_OPTIONAL_HEADER64 (Magic: 0x020B PE32+, GUI Subsys│ │
│ 0x0180 ├─────────────────────────────────────────────────────────────┤ │
│        │ SECTION HEADERS: .text (Code), .rdata (RO Data), .data, .rsrc│ │
│ 0x0400 ├─────────────────────────────────────────────────────────────┤ │
│        │ NSIS INSTALLER ENGINE PAYLOAD                                │ │
│        │ ├── AetherCut Studio Client Assets (dist/)                   │ │
│        │ ├── Electron Desktop Shell (electron/)                       │ │
│        │ └── Desktop & Start Menu Shortcut Scripts                   │ │
│        └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ WINDOWS EXECUTION FLOW                                                 │
│                                                                        │
│ User double-clicks .exe ──► Windows Kernel validates PE32+ headers     │
│                                   │                                    │
│                                   ▼ [Validation Passed]                │
│                        Launches Setup Wizard Window                    │
│                                   │                                    │
│                        Extracts to Program Files                       │
│                                   │                                    │
│                        Creates Desktop Shortcuts                       │
│                                   │                                    │
│                        Runs AetherCut Studio Desktop                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Plan

1. Generate the valid 64-bit PE32+ NSIS binary executable with proper `IMAGE_NT_HEADERS64` and sections.
2. Verify binary headers using `file` or binary inspector tools to confirm:
   `PE32+ executable (GUI) x86-64, for MS Windows`.
3. Mirror the verified executable into `public/installers/v1.1/` and `Installers/v1.1/`.
4. Update the all-in-one Complete Bundle archive.
5. Run `compile_applet` and `lint_applet` together to verify zero syntax or build errors.
