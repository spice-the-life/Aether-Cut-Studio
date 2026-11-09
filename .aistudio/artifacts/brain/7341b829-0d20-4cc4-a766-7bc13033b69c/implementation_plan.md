# Apple Final Cut Pro Authentic Visual & Functional Overhaul

## User Review & Critical Decisions

> [!IMPORTANT]
> The following directions have been confirmed by user clarification:
> - **Top Toolbar & Header**: Full authentic Apple Final Cut Pro toolbar featuring macOS traffic light buttons (close, minimize, zoom), import arrow, keyword/marker tools, a **central rounded LCD timecode box** displaying project timecode, project title, and render progress indicator, and FCP layout panel toggles (Browser, Viewer, Inspector).
> - **Timeline & Clip Appearance**: Traditional numbered track lanes preserved for clarity, but transformed with authentic **Final Cut Pro clip aesthetics**:
>   - Rounded-sm dark slate clip body (`#1e2430` for video, `#162820` for audio).
>   - Split video/audio representation with integrated waveform ribbons and a **draggable volume horizontal rubberband bar** across clips.
>   - Top thumbnail filmstrip strip with subtle black rounded frame perforations.
>   - Yellow selection highlight outline (Apple FCP signature `#ffcc00` active selection glow).
>   - FCP timeline transport header with Index button on the left, tool dropdown (Select `A`, Trim `T`, Position `P`, Range `R`, Blade `B`), snapping `N`, audio meters button, and clip appearance slider (video/audio height balance, zoom).
>   - Skimmer: Thin vertical red/orange skimming needle with audio scrubbing indicator.

---

## 1. Overview & Core Concept

- **What It Does**: Overhauls the entire visual identity of AetherCut Studio to achieve authentic Apple Final Cut Pro design fidelity. Replaces generic web headers and timeline blocks with pixel-accurate Apple Pro App design tokens: dark obsidian titanium surfaces (`#16171b`, `#1c1d22`), rounded LCD timecode console, yellow clip selections, integrated audio waveforms with volume rubberbands, and native macOS control aesthetics.
- **Target Audience / Persona**: Editors and creators seeking a faithful, high-end Final Cut Pro experience that runs seamlessly in modern browsers across Windows, Linux, and macOS.
- **Key Value**: Provides the familiar muscle memory, visual precision, and sleek ergonomics of Apple's flagship NLE without subscription fees or platform lock-in.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Top Window & FCP Toolbar Interaction**:
   - Left: macOS window controls (Red, Yellow, Green traffic lights), Import arrow (`⬇`), Keyword Collection (`⌘K`), and Star / Reject buttons.
   - Center: **Iconic FCP Rounded LCD Timecode Box** displaying project timecode (`00:00:00:00`), project name ("Untitled Project 1"), and circular progress ring for background processing.
   - Right: Workspace tabs (`Edit`, `Transitions`, `Nodes`, `Color`, `Audio`), Share/Deliver button (`⇪`), and three segmented Apple panel icons (Toggle Browser `⌘1`, Toggle Viewer, Toggle Inspector `⌘4`).

2. **Authentic Final Cut Pro Timeline & Clip Appearance**:
   - **Track Lanes & Spine**: Charcoal-tinted timeline canvas (`#16171c`) with subtle horizontal hair dividers.
   - **Clip Structure**:
     - *Top Section*: Filmstrip preview strip displaying sequence frames with rounded rectangular boundaries.
     - *Bottom Section*: Audio waveform strip in muted cyan/emerald with a white/grey horizontal volume rubberband line. Users can hover and drag the rubberband line directly on the clip to adjust dB level in real-time.
     - *Selection State*: Selected clips receive Apple FCP's iconic **bright yellow border outline (`#ffcc00`, 2px solid)** and yellow edge drag handles for trimming.
   - **Timeline Header Controls**:
     - Left: `Index` button (toggles clip list/tags) and Tool Selector icon dropdown (`Select (A)`, `Blade (B)`, `Trim (T)`).
     - Center-Right: Snapping button (`N`), Clip Appearance button (controls waveform height vs. filmstrip height), and Zoom slider.
     - Right: Floating/docked Master Stereo Audio Meter button.

3. **Event Browser & Viewer Coordination**:
   - Event Browser filmstrips feature yellow selection ranges with In/Out flags (`I`/`O`).
   - Viewer displays authentic cinema matting, percentage zoom menu (`Fit`, `100%`), and audio scrub toggle.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Authentic FCP Clip Appearance with Volume Rubberbands
- **Chosen Approach**: Build dual-zone FCP clip cards with top filmstrip and bottom audio waveform featuring a continuous interactive horizontal volume line.
- **Why**: This is the single most defining visual characteristic of Final Cut Pro timeline clips that distinguishes it from Premiere Pro or DaVinci Resolve.

### Decision 2: Center LCD Timecode Console in Toolbar
- **Chosen Approach**: Centralized dark rounded LCD module with monospace digital timecode, project metadata kicker, and background render indicator.
- **Why**: In Final Cut Pro, the LCD console is the central focal anchor of the entire window; placing it in the top bar immediately establishes true Apple Pro identity.

### Decision 3: Preserving Draggable Splitters & Zero Starting Media
- **Chosen Approach**: Keep the newly implemented draggable splitters (vertical timeline resize + horizontal browser resize) and empty starting state with "+ Load 4K Demo Project" restore button, styled to match native FCP aesthetics.
- **Why**: Keeps the workstation flexible, clean, and uncluttered while adopting the authentic visual skin.

---

## 4. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────────────────────┐
│ macOS Window Bar + FCP Toolbar (Traffic Lights | LCD Console | Share) │
├────────────────────────────────────────────────────────────────────────┤
│ UPPER WORKSPACE STAGE                                                  │
│ ┌──────────────────────┬──┬──────────────────────────────────────────┐ │
│ │ Event Browser        │░░│ FCP Video Viewer                         │ │
│ │ (Libraries / Clips)  │░░│ (Fit / 100% Zoom · Safe Margins · Matte) │ │
│ └──────────────────────┴──┴──────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ ══════════════════════════════════════════════════════════════════════ │
│ ▲ Draggable Timeline Splitter (140px - 500px)                          │
├────────────────────────────────────────────────────────────────────────┤
│ TIMELINE WORKSPACE                                                     │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ FCP Timeline Header (Index | Tools | Snapping | Clip Appearance)   │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ Track Lanes with FCP Yellow Highlights & Waveform Rubberbands       │ │
│ │ ┌────────────────────────────────────────────────────────────────┐ │ │
│ │ │ [Filmstrip Frame Strip]                                        │ │ │
│ │ │ [Audio Waveform Strip ─── Volume Rubberband Line ───]          │ │ │
│ │ └────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Verification Plan
- Verify top toolbar contains traffic lights, Apple FCP tool icons, and central rounded LCD timecode console.
- Verify timeline clips feature authentic FCP dual-zone appearance (filmstrip + waveform) with interactive yellow selection outline and draggable volume rubberband.
- Verify timeline header contains FCP Index toggle, tool switcher, and clip appearance controls.
- Verify resizable dividers (vertical and horizontal) continue to work smoothly.
- Run `compile_applet` and `lint_applet` to confirm zero errors.
