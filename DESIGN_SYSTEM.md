# Historic Graves Trail PWA — Design System

A portable design reference for replicating the look and feel in a separate React + TypeScript + Tailwind app.

---

## 1. Colour Palette

### Design tokens (from `src/index.css`)

| Token | Hex | Usage |
|-------|-----|-------|
| `tmt-teal` | `#3a9b8e` | Primary accent, left borders on cards, progress bar fill, header border |
| `tmt-navy` | `#1a2a2a` | Header background, headings, dark hero sections |
| `tmt-focus` | `#ffdd00` | Focus ring (accessibility) |
| `govuk-red` | `#d4351c` | Error, destructive actions, required asterisk |
| `govuk-green` | `#00703c` | Success, validated state, trail complete badge |
| `govuk-text` | `#0b0c0c` | Primary body text |
| `govuk-muted` | `#505a5f` | Muted text, disabled buttons |
| `govuk-border` | `#0b0c0c` | Form borders |
| `govuk-background` | `#f3f2f1` | Skeleton/placeholder backgrounds |

### Additional colours (inline hex)

| Hex | Usage |
|-----|-------|
| `#2d7a6e` | Primary button background, active nav, category chips selected, outline buttons |
| `#595959` | Secondary text, labels, helper text |
| `#e0e0e0` | Borders, progress bar track, pill backgrounds |
| `#f5f5f0` | Page background (cream/off-white) |
| `#ffffff` | Card backgrounds, input backgrounds |
| `#9ca3af` | Tertiary/muted text (IDs, filenames) |
| `#b45309` | Warning (amber-ish), GPS missing, validation warnings |
| `#f59e0b` | Amber — needs validation state, warning borders |
| `#fef3c7` | Warning message background |
| `#c0392b` | Destructive archive button |
| `#505a5f` | Disabled button text (govuk-muted) |

### Semantic mapping

- **Primary**: `#2d7a6e` (buttons, active states)
- **Secondary**: `#3a9b8e` (accents, borders)
- **Background**: `#f5f5f0` (page), `#ffffff` (cards)
- **Text**: `#0b0c0c` (primary), `#595959` (secondary), `#9ca3af` (tertiary)
- **Error**: `#d4351c` (govuk-red)
- **Success**: `#00703c` (govuk-green)
- **Warning**: `#b45309`, `#f59e0b`
- **Focus**: `#ffdd00` (3px outline, 2px offset)

---

## 2. Typography

### Font family

```css
font-family: Inter, system-ui, sans-serif;
```

Loaded via Google Fonts: `Inter` (weights 400, 500, 600, 700).

### Base

- **Root**: `font-size: 18px`, `line-height: 1.5`
- **Colour**: `#0b0c0c`

### Sizes and weights

| Element | Classes / Spec | Size | Weight |
|---------|----------------|------|--------|
| Page title (h1) | `text-2xl` / `text-3xl` | 24px / 30px | `font-semibold` (600) |
| Section heading (h2) | `text-xl` / `text-[20px]` | 20px | `font-bold` (700) |
| Card title | `text-[20px]` | 20px | `font-bold` |
| Subsection heading | `text-lg` | 18px | `font-semibold` / `font-bold` |
| Body text | `text-lg` / `text-base` | 18px / 16px | `font-normal` (400) |
| Labels | `text-lg` | 18px | `font-bold` |
| Helper text | `text-sm` | 14px | `font-normal` |
| Small / tertiary | `text-xs` | 12px | `font-normal` |
| Buttons | `text-lg` | 18px | `font-bold` |
| Badge / chip | `text-sm` | 14px | `font-bold` / `font-semibold` |
| Monospace (IDs) | `font-mono text-sm` | 14px | `font-normal` |

---

## 3. Button Styles

### Primary (solid)

- **Background**: `#2d7a6e` or `bg-[#2d7a6e]`
- **Text**: white, `font-bold`, `text-lg`
- **Height**: `min-h-[56px]` (48px for smaller actions)
- **Padding**: `px-4 py-3` or `px-6`
- **Border radius**: `rounded-[12px]` or `rounded-lg` (8px)
- **Disabled**: `opacity-50`, `cursor-not-allowed`

### Secondary (outline)

- **Background**: `bg-white`
- **Border**: `border-2 border-[#2d7a6e]`
- **Text**: `text-[#2d7a6e]`, `font-bold`
- **Hover**: `hover:bg-[#f5f5f0]`
- **Border radius**: `rounded-[12px]`

### Destructive

- **Primary**: `bg-govuk-red` (`#d4351c`), white text
- **Outline**: `bg-white border-2 border-govuk-red text-govuk-red`
- **Archive (strong destructive)**: `bg-[#c0392b]`, white text

### Disabled

- **Primary disabled**: `bg-govuk-muted` (`#505a5f`), white text, `opacity-60`, `cursor-not-allowed`
- **Generic disabled**: `disabled:opacity-50 disabled:cursor-not-allowed`

### Success state (post-action)

- **Background**: `bg-govuk-green` (`#00703c`)
- Used for "Saved", "Export downloaded!", etc.

---

## 4. Form Elements

### Input fields

- **Border**: `border-2 border-[#0b0c0c]`
- **Background**: `bg-white`
- **Padding**: `px-4 py-3`
- **Min height**: `min-h-[48px]` or `min-h-[56px]`
- **Font**: `text-lg`
- **Border radius**: `rounded-lg` (8px)
- **Focus**: Global `*:focus-visible` — 3px solid `#ffdd00`, 2px offset

### Textareas

- Same as inputs: `border-2 border-[#0b0c0c]`, `bg-white`, `px-4 py-3`, `rounded-lg`
- `resize-y` for vertical resize

### File input (styled label)

- Label styled as button: `border-2 border-[#2d7a6e] text-[#2d7a6e]`, `file:border-2 file:border-[#0b0c0c]` for the file button part

### Checkboxes

- Size: `w-6 h-6`
- Focus: `focus:ring-[3px] focus:ring-[#ffdd00] focus:ring-offset-2`

### Labels

- `block text-lg font-bold text-[#1a2a2a] mb-2`
- Required asterisk: `<span className="text-govuk-red">*</span>`

### Error text

- `text-govuk-red font-bold`

---

## 5. Card / Panel Styles

### Standard card

- **Background**: `bg-white`
- **Border radius**: `rounded-xl` (12px)
- **Padding**: `p-5` or `p-4`
- **Shadow**: `shadow-[0_2px_8px_rgba(0,0,0,0.10)]`
- **Left accent**: `border-l-[5px] border-l-[#3a9b8e]` (teal) — used for info cards, modals, sync status

### Status-specific left border

- **Success**: `border-l-govuk-green`
- **Warning**: `border-l-amber-500` or `border-l-[#f59e0b]`
- **Error**: `border-l-govuk-red`
- **Default**: `border-l-[#3a9b8e]`

### Nested card (e.g. in modals)

- Same as above: `bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-[#3a9b8e]`

### Bottom sheet / floating panel

- `rounded-t-xl shadow-[0_-2px_8px_rgba(0,0,0,0.08)] border-t border-[#e0e0e0]`

---

## 6. Category Picker (Grouped Chip Selector)

- **Layout**: `space-y-4` for groups, `flex flex-wrap gap-2` for chips within a group
- **Group label**: `text-sm font-semibold text-[#595959] mb-2`
- **Chip (unselected)**: `min-h-[48px] px-4 py-2 font-bold border-2 rounded-full bg-white border-[#2d7a6e] text-[#2d7a6e]`
- **Chip (selected)**: `bg-[#2d7a6e] border-[#2d7a6e] text-white`
- **Role**: `role="group"`, `aria-labelledby`, `aria-pressed` on buttons

---

## 7. Header / Navigation

### Header

- **Background**: `bg-tmt-navy` (`#1a2a2a`)
- **Text**: white
- **Height**: `min-h-[56px]`
- **Padding**: `px-4 py-3`
- **Layout**: `flex items-center gap-3`
- **Border**: `border-b border-[#3a9b8e]`
- **Logo**: `h-8 w-8`
- **Title**: `font-semibold text-[20px]`

### Bottom navigation

- **Background**: `bg-white`
- **Border**: `border-t border-[#e0e0e0]`
- **Height**: `min-h-[64px]`
- **Layout**: `flex items-center justify-around`
- **Link**: `min-h-[48px] min-w-[48px] flex flex-col items-center justify-center px-4 font-medium text-lg`
- **Active**: `text-[#2d7a6e]`
- **Inactive**: `text-[#595959]`
- **Position**: `fixed bottom-0 left-0 right-0`

---

## 8. Icon Usage

- **Library**: No dedicated icon library. Uses:
  - **Emoji**: 📍, 📷, 🖼️, ✓, ○, ●, ↑, ↓
  - **Inline SVG**: Delete icon in TrailScreen (24×24 viewBox, stroke-based)
- **Sizing**: Emoji at `text-6xl`, `text-3xl`, `text-2xl`, or inline with text
- **Colour**: Inherits from parent (`text-govuk-green`, `text-govuk-red`, etc.)
- **Logo**: SVG asset `logo-banner.svg`, typically `h-8 w-8` or `h-24 w-24`

---

## 9. Spacing and Layout Conventions

### Page layout

- **Background**: `bg-[#f5f5f0]`
- **Padding**: `p-6`
- **Bottom padding (with nav)**: `pb-24` to clear fixed bottom nav
- **Max width**: `max-w-[680px] mx-auto` on content-heavy screens (Welcome, Sync, Home)

### Spacing scale

- **Section gap**: `mb-6`, `mb-8`, `space-y-6`
- **Element gap**: `gap-2`, `gap-3`, `gap-4`
- **Card padding**: `p-4`, `p-5`
- **Form field margin**: `mb-6` for fields, `mb-2` for labels

### Mobile vs desktop

- Single-column layout throughout
- Touch targets: `min-h-[48px]` or `min-h-[56px]` for buttons
- No breakpoints for different layouts — mobile-first

---

## 10. Custom Components

### Progress bar

- **Track**: `h-[10px] bg-[#e0e0e0] rounded-full overflow-hidden`
- **Fill**: `bg-[#3a9b8e] rounded-full transition-all`, width as percentage
- **Native `<progress>`**: `h-3 rounded-full`, `[&::-webkit-progress-bar]:bg-white`, `[&::-webkit-progress-value]:bg-[#2d7a6e]`, `[&::-moz-progress-bar]:bg-[#2d7a6e]`

### Sync status indicator

- **Green (synced)**: Card with `border-l-govuk-green`, ✓ icon, "Your work is safe"
- **Amber (pending)**: Card with `border-l-amber-500`, ● icon, "Saving when you have a connection"
- **Red (error)**: Card with `border-l-govuk-red`, ● icon, "Sync problem"
- **Spinner**: `w-5 h-5 border-2 border-tmt-teal border-t-transparent rounded-full animate-spin`

### Photo capture UI

- **Idle hero**: `bg-[#1a2a2a]` with emoji and white text
- **Live camera**: Full-screen black background, white corner guides (L-shaped, 22px × 3px, drop shadow)
- **Capture button**: `w-20 h-20 rounded-full bg-white border-4 border-govuk-text`, inner circle `w-16 h-16 rounded-full bg-[#2d7a6e]`
- **Preview bar**: White background, `border-t border-[#e0e0e0]`, Retake (destructive outline) + Use Photo (primary)
- **Success banner**: `bg-[#2d7a6e] text-white text-center text-lg font-bold py-3 px-4`

### Camera guide overlay

- Four L-shaped corners, `22px` length, `3px` thickness, white with `drop-shadow(0 1px 2px rgba(0,0,0,0.5))`
- Positioned `inset-[8%]` from edges

### Modal / overlay

- **Backdrop**: `fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50`
- **Content**: `bg-white p-5 max-w-md rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-[#3a9b8e]`

### Trail / POI list item

- **Validated**: `border-l-govuk-green`, ✓ icon
- **Needs validation**: `border-l-[#f59e0b]`, ○ icon
- **Hover/focus**: `hover:border-l-[#3a9b8e]`, `focus-within:ring-2 focus-within:ring-tmt-focus`

---

## Tailwind v4 Setup

The app uses Tailwind v4 with `@tailwindcss/vite`. Custom tokens are defined in `src/index.css`:

```css
@theme {
  --color-tmt-teal: #3a9b8e;
  --color-tmt-navy: #1a2a2a;
  --color-tmt-focus: #ffdd00;
  --color-govuk-red: #d4351c;
  --color-govuk-green: #00703c;
  --color-govuk-text: #0b0c0c;
  --color-govuk-muted: #505a5f;
  --color-govuk-border: #0b0c0c;
  --color-govuk-background: #f3f2f1;
}
```

Global focus state:

```css
*:focus-visible {
  outline: 3px solid #ffdd00;
  outline-offset: 2px;
}
```

---

## Quick Reference: Common Patterns

| Pattern | Classes |
|---------|---------|
| Page container | `min-h-screen bg-[#f5f5f0] p-6 pb-24` |
| Page title | `text-2xl font-semibold text-[#1a2a2a] mb-6` |
| Primary button | `min-h-[56px] bg-[#2d7a6e] text-white font-bold text-lg rounded-[12px]` |
| Secondary button | `min-h-[56px] border-2 border-[#2d7a6e] text-[#2d7a6e] bg-white font-bold rounded-[12px]` |
| Input | `block w-full min-h-[48px] px-4 py-3 text-lg border-2 border-[#0b0c0c] bg-white rounded-lg` |
| Card | `bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.10)] border-l-[5px] border-l-[#3a9b8e]` |
| Section divider | `border-t border-[#e0e0e0] mt-8 pt-8` |
