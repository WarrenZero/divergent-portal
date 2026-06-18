# Divergent Typography & CSS Specification
## Premium UI — 70% Female Demographic · Top-5 SaaS Tier

Read this before writing ANY new UI component or 
modifying any existing styles.

---

## Font Pairings

### Header Font (H1, H2, H3)
- Primary: 'Plus Jakarta Sans'
- Fallback: 'Cabinet Grotesk', sans-serif
- Weight: 600 (Semi-Bold)
- Character: Elegant geometric sans-serif with 
  smooth terminal curves

### Body & Interface Font
- Primary: 'Inter'
- Fallback: 'Satoshi', sans-serif
- Body weight: 400 (Regular)
- Button/label weight: 500 (Medium)

### Warren's Voice (clinical notes, quotes)
- Font: 'Lora', serif (keep existing)
- Style: italic
- Color: var(--pine-400)

---

## Typography Scale

| Element | Size | Line-Height | Letter-Spacing | Weight |
|---|---|---|---|---|
| Hero H1 | 32px | 1.25 | -0.02em | 600 |
| Section H2 | 24px | 1.30 | -0.01em | 600 |
| Card Title H3 | 18px | 1.40 | 0 | 600 |
| Body Text | 15px | 1.60 | 0 | 400 |
| Button/Label | 14px | 1.40 | 0 | 500 |
| Caption/Meta | 12px | 1.40 | 0 | 500 |

---

## Border Radius — NO SHARP EDGES RULE

| Element | Border Radius |
|---|---|
| Large containers, modals, hero cards | 24px |
| Standard cards, panels, drawers | 16px |
| Small buttons, inputs, badges | 12px |
| Pill buttons, tags, chips | 100px |
| Avatars | 50% |

NEVER use border-radius below 8px on any 
client-facing element.

---

## Input Fields

height: 48px (minimum) to 52px
padding-left: 16px
padding-right: 16px
border: 1.5px solid rgba(58, 92, 66, 0.15)
  (faint Forest Pine tint on Warm Bone bg)
border-radius: 12px
background: white
font-family: 'Inter', sans-serif
font-size: 15px
font-weight: 400
color: var(--bone-800)

Focus/hover state:
transition: all 0.2s ease-in-out;
border-color: rgba(192, 120, 72, 0.4);
box-shadow: 0 0 0 3px rgba(184, 115, 51, 0.15);
outline: none;

Placeholder:
color: var(--pine-300);
font-style: normal;

---

## Shadow System — NO HARSH SHADOWS

### Floating card (default):
box-shadow: 0px 8px 32px rgba(26, 43, 33, 0.04);

### Hover lift:
box-shadow: 0px 12px 40px rgba(26, 43, 33, 0.08);

### Modal/drawer overlay:
box-shadow: 0px 24px 64px rgba(26, 43, 33, 0.12);

### Button shadow (copper CTA):
box-shadow: 0px 4px 16px rgba(192, 120, 72, 0.25);

### Button shadow hover:
box-shadow: 0px 6px 24px rgba(192, 120, 72, 0.35);

NEVER use rgba(0,0,0,x) shadows — always use 
the Forest Pine base color rgba(26,43,33,x) 
or Copper rgba(192,120,72,x) for organic depth.

---

## Transition Standard

All interactive elements:
transition: all 0.2s ease-in-out;

Accordion open/close:
transition: grid-template-rows 0.3s 
  cubic-bezier(0.4, 0, 0.2, 1);

Page entrance:
animation: fadeUp 0.3s ease forwards;

Button press:
transform: scale(0.98);
transition: transform 0.1s ease;

---

## Color Application (unchanged palette)

Backgrounds:
- Page: var(--bone-50) #FDFAF5
- Card: white
- Dark card/hero: var(--pine-900) #0F1F13
- Section bg: var(--bone-100) #F8F2E8

Text:
- Primary: var(--bone-800) #5A4C38
- Secondary: var(--bone-600) #9A8A72
- On dark: var(--bone-50) #FDFAF5
- Muted on dark: var(--pine-300) #80A088

Borders:
- Light: rgba(58, 92, 66, 0.12) 
  (Forest Pine at 12% opacity)
- Standard: var(--bone-300) #E8DECE
- Active/focus: var(--copper-500) #C07848

---

## Google Fonts Import

Add to app/layout.tsx or globals.css:

@import url('https://fonts.googleapis.com/css2?
  family=Plus+Jakarta+Sans:wght@400;500;600;700;800&
  family=Inter:wght@400;500;600&
  family=Lora:ital,wght@0,400;0,600;1,400;1,600&
  display=swap');

---

## CSS Variable Updates for globals.css

--font-display: 'Plus Jakarta Sans', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--font-serif: 'Lora', serif;

--radius-xl: 24px;
--radius-lg: 16px;
--radius-md: 12px;
--radius-sm: 8px;
--radius-pill: 100px;

--shadow-card: 0px 8px 32px rgba(26,43,33,0.04);
--shadow-hover: 0px 12px 40px rgba(26,43,33,0.08);
--shadow-modal: 0px 24px 64px rgba(26,43,33,0.12);
--shadow-cta: 0px 4px 16px rgba(192,120,72,0.25);

---

## Implementation Priority

Apply this spec to new components first, 
then retrofit existing components in this order:
1. Client home screen (highest visibility)
2. Practitioner dashboard
3. Reasoning workspace join page
4. All form inputs across the portal
5. Navigation (sidebar + bottom nav)

Then also update CLAUDE.md at project root 
to reference this new skill file.
