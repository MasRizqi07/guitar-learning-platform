---
name: FretFlow Precision Dark
colors:
  surface: '#101319'
  surface-dim: '#101319'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a30'
  surface-container-highest: '#32353b'
  on-surface: '#e1e2eb'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2d3037'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#4ae176'
  on-secondary: '#003915'
  secondary-container: '#00b954'
  on-secondary-container: '#004119'
  tertiary: '#ffbcb7'
  on-tertiary: '#68000a'
  tertiary-container: '#ff938c'
  on-tertiary-container: '#8d0012'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#6bff8f'
  secondary-fixed-dim: '#4ae176'
  on-secondary-fixed: '#002109'
  on-secondary-fixed-variant: '#005321'
  tertiary-fixed: '#ffdad7'
  tertiary-fixed-dim: '#ffb3ad'
  on-tertiary-fixed: '#410004'
  on-tertiary-fixed-variant: '#930013'
  background: '#101319'
  on-background: '#e1e2eb'
  surface-variant: '#32353b'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Geist
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  mono-metric:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.03em
  mono-fret:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system channels the rigor of modern digital audio workstations and hardware synthesizers into an engaging, gamified learning loop. The interface merges the technical discipline of high-end software (Linear, Ableton Live) with the immediate, visceral feedback loops of tactile gamification.

The aesthetic rests on three pillars:
- **Audio-Engineering Precision**: Obsidian backgrounds, dense metric readouts, and hairline 1px structural framing communicate competence and mastery.
- **Haptic Tactility**: Interactive elements feature distinct inset depths, micro-press deflections, and glowing amber cathode states that feel physically responsive.
- **Dynamic Chromatic Metering**: Active frets, strings, pitch readouts, and tempo meters use hyper-legible signal accents against deep matte surfaces, ensuring clear visibility during practice sessions under diverse ambient lighting.

## Colors

The palette establishes an ultra-low glare darkroom environment calibrated for prolonged instrument practice. It maintains full WCAG 2.2 AA contrast compliance across all interactive states.

### Palette Architecture
- **Canvas Base (`#0E1014`)**: Pitch obsidian base; anchors all structural hierarchy.
- **Surface Default (`#171A20`)**: Neutral matte container for inactive modules, decks, and fretboard gutters.
- **Surface Elevated / Hover (`#20242C`)**: Raised interactive targets, active decks, and hover feedback layers.
- **Hairline Border (`#2A303A`)**: Structural 1px separation frame for sub-panels and instrument diagrams.
- **Primary Accent (`#F59E0B`)**: Electric amber gold for playheads, active fretting positions, target notes, and primary actions.
- **Primary Hover (`#D97706`)**: Compressed amber for active down-states and hovered action buttons.
- **Success (`#22C55E`)**: Emerald green for pitch accuracy, streak validation, and tempo lock.
- **Danger / Miss (`#EF4444`)**: Signal red for missed fret triggers, off-pitch bends, and metronome faults.
- **Text Primary (`#F8FAFC`)**: High-luminance crisp white-slate for tablature notation, metrics, and core headers.
- **Text Muted (`#94A3B8`)**: Mid-tone slate for string labels, secondary metrics, and hotkey hints.

## Typography

The typographic system utilizes a dual-engine architecture:
1. **Primary Interface (`Geist`)**: Used across displays, headers, and UI copy. Negative tracking (-0.01em to -0.03em) produces a cohesive, modern machine-crafted finish.
2. **Technical Data & Musical Notation (`JetBrains Mono`)**: Handles BPM readouts, interval calculations, fret positions, string indicators, and tablature. Fixed character widths eliminate layout shift during rapid pitch tracking or metronome changes.

### Typographic Rules
- All auxiliary meta labels, tempo indicators, and chord formulas default to `label-caps` with uppercase transformation.
- Number readouts for accuracy scores, speed benchmarks (BPM), and fret coordinates strictly use `mono-metric` or `mono-fret` to preserve column integrity.

## Layout & Spacing

Layouts adhere to an 8px base rhythm with 4px sub-grid micro adjustments. 

### Grid Geometry & Breakpoints
- **Desktop (1200px+)**: 12-column layout with 20px (`gutter`) column spacing and 32px (`margin`) outer margins. Accommodates dual-deck structures: interactive horizontal fretboard viewport alongside real-time audio analysis readouts.
- **Tablet (768px – 1199px)**: 8-column layout with 16px gutters and 24px margins. Tablature and fretboard viewports shift to vertical stacking with fixed floating transport controls.
- **Mobile (320px – 767px)**: 4-column layout with 12px (`gutter-mobile`) gutters and 16px (`margin-mobile`) margins. The interactive fretboard switches to an auto-scrolling focused window or vertical string orientation.

### Touch Target Standard
All clickable, selectable, and interactive trigger elements—including individual string-fret intersection nodes—must maintain an absolute minimum touch zone of 44x44px, regardless of the rendered visual diameter of the fret indicator.

## Elevation & Depth

Visual hierarchy does not use soft blurred dropshadows. Instead, depth is achieved via **structural surface stacking, hairline 1px borders, and localized luminescence**.

### Layering Hierarchy
- **Level 0 (Backdrop)**: `#0E1014` — Base canvas.
- **Level 1 (Card / Structural Panels)**: `#171A20` surrounded by a uniform `1px solid #2A303A` border.
- **Level 2 (Active/Hover/Floating Modals)**: `#20242C` with `backdrop-filter: blur(12px)` and border lightened to `#3E4654`.

### Glow & Active Radiance
- **Amber Glow (Active Strings / Notes)**: `box-shadow: 0 0 16px 2px rgba(245, 158, 11, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.12)`.
- **Target Pitch Lock (Success)**: `box-shadow: 0 0 16px 2px rgba(34, 197, 94, 0.32)`.
- **Tonal Insets**: Form controls, audio scrubbers, and empty fretboard slots utilize `inset 0 1px 3px rgba(0, 0, 0, 0.5)` to carve elements into the interface surface.

## Shapes

The interface balances sharp industrial hardware aesthetics with human interface ergonomics through compact corner radiuses (`roundedness: 1`):
- **Base Components (Buttons, Chips, Inputs)**: `4px` (`0.25rem`). Clean, precise, and instrument-like.
- **Panels & Module Containers**: `8px` (`0.5rem`). Soft enough to contain complex multi-track feeds without visual harshness.
- **Interactive Modals & Practice Overlays**: `12px` (`0.75rem`).
- **Fret Markers & Pitch Nodes**: Circular geometry (`9999px`) to match physical guitar fretboard inlays.

## Components

### Buttons
- **Primary Action (Tactile Amber)**: Background `#F59E0B`, text `#0E1014`, font weight 600. Border: `1px solid #F59E0B`. Box-shadow: `inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 2px 4px rgba(0, 0, 0, 0.4)`. In active press: translates down 1px, background `#D97706`, box-shadow: `inset 0 2px 4px rgba(0, 0, 0, 0.6)`. Min-height: 44px.
- **Secondary Action (Console Neutral)**: Background `#171A20`, text `#F8FAFC`, border: `1px solid #2A303A`. Hover: `#20242C`, border `#3E4654`. Active down: `#14171C`.

### Chips & Filter Toggles
- Compact height (28px to 32px), uppercase `label-caps` typography.
- Inactive: Background `#171A20`, border `1px solid #2A303A`, text `#94A3B8`.
- Selected: Background `rgba(245, 158, 11, 0.12)`, border `1px solid #F59E0B`, text `#F59E0B`. Includes a 6x6px pulsing amber status dot.

### Inputs & Metronome Adjusters
- Background `#0E1014`, border `1px solid #2A303A`, text `#F8FAFC`, height 44px.
- Focus: Border `1px solid #F59E0B`, box-shadow `0 0 0 1px #F59E0B, 0 0 12px rgba(245, 158, 11, 0.2)`.

### Cards & Lesson Modules
- Base: Background `#171A20`, border `1px solid #2A303A`, border-radius 8px.
- Hover State: Elevates to `#20242C`, border changes to `#3E4654`. Transition: `border-color 150ms ease, background 150ms ease`.

### Interactive Fretboard & Note Track (Domain Components)
- **Fret Wire**: 1px vertical divider `#2A303A`; nut is 4px wide `#94A3B8`.
- **Strings**: Continuous horizontal lines varying in height from 1px (high E) to 3px (low E), colored `#3E4654`. Active string lights up in `#F8FAFC`.
- **Note Targets (Hit Markers)**: 28px diameter visual target centered within a 44x44px touch bounding box. Filled with `#171A20`, border `2px solid #F59E0B`. 
  - Perfect Hit: Fills with `#22C55E`, border `#22C55E`, expands with a radial green wave.
  - Missed Fret: Flashes `#EF4444` with a quick 3px horizontal shake.
- **Tablature Cursor / Playhead**: High-intensity 2px line in `#F59E0B` with `box-shadow: 0 0 8px #F59E0B`.

### Gamified Streak & Tempo Badges
- Inline telemetry indicators combining `JetBrains Mono` digits with subtle color-tinted capsule backings.
- Streak counters feature continuous low-amplitude amber breathing glow (`animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite`).