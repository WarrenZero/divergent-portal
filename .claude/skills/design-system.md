# Divergent Design System

## Color Tokens (LOCKED — never change)

```css
/* Pine — primary backgrounds, sidebar, surfaces */
--pine-900: #0F1F13   /* near-black green — primary page bg */
--pine-800: #162A1A
--pine-700: #1E3122   /* sidebar, dark surfaces */
--pine-600: #2A4330
--pine-500: #3A5C42   /* active states, borders */
--pine-400: #5A7C62
--pine-300: #80A088
--pine-200: #B0C8B4
--pine-100: #DDE8DE   /* light pine surfaces */

/* Bone — light mode surfaces */
--bone-50:  #FDFAF5   /* primary page background */
--bone-100: #F8F2E8   /* card surfaces */
--bone-200: #F0E8DA
--bone-300: #E8DECE   /* borders */
--bone-400: #D4C4B0
--bone-600: #9A8A72   /* muted text */
--bone-800: #5A4C38   /* body text */

/* Copper — accent, CTAs, warnings */
--copper-500: #C07848   /* primary accent */
--copper-400: #D08C5C
--copper-300: #DFA878   /* light accent, italic highlights */
--copper-700: #8A4810   /* dark copper, warnings */
--copper-100: #F5E0CC   /* copper tint backgrounds */
```

**Never use:** arbitrary hex values outside this palette. No Inter, Roboto, system-ui.

## Typography (LOCKED)

```
Display / UI labels:  Syne       — weights 500, 600, 700, 800
Body / narrative:     Lora       — regular + italic
Monospace / tech:     JetBrains Mono — weights 400, 500
```

Load via Google Fonts in `app/layout.tsx`. Apply via CSS classes or `font-family` referencing the loaded font variables.

## Motion Tokens

```css
--ease-out:    cubic-bezier(0.22, 1, 0.36, 1)
--ease-in-out: cubic-bezier(0.65, 0.05, 0.36, 1)
--dur-fast:    150ms
--dur-base:    240ms
--dur-slow:    380ms
```

## Z-Index Scale

```css
--z-nav:     100
--z-drawer:  500
--z-modal:   1000
--z-toast:   2000
--z-palette: 3000
```

## The ✦ Glyph (U+2726)

The four-pointed star is the Divergent brand mark. It appears on:
- Landing hero
- Clinical Co-Pilot FAB button
- Sidebar header
- Toast notifications

**Never remove it. Never replace with ★ or other star characters.**

## Component Patterns

### Cards
```css
background: var(--bone-100);
border: 1px solid var(--bone-300);
border-radius: 12px;
padding: 24px;
```

### Primary Button
```css
background: var(--copper-500);
color: var(--bone-50);
font-family: Syne;
font-weight: 600;
border-radius: 8px;
transition: background var(--dur-fast) var(--ease-out);
```

### Sidebar (practitioner)
```css
background: var(--pine-700);
color: var(--pine-200);
width: 240px;
```

Active sidebar item:
```css
background: var(--pine-600);
color: var(--bone-50);
border-left: 3px solid var(--copper-400);
```

### Toast Notifications
Four types: success (pine), info (bone), warn (copper-300), error (copper-700).
Always include ✦ glyph prefix in success toasts.

## CSS Module Files
Each component has a paired `.module.css` file in the same directory.
Global tokens live in `app/globals.css` (currently minimal — expand as needed).

## Design Philosophy
**Parasympathetic-first.** Every color, interaction, and animation is engineered to calm the nervous system. Avoid harsh contrasts, jarring transitions, or aggressive red error states. Warm bone backgrounds, forest pine depth, muted copper accent.
