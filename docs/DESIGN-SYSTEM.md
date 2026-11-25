# BuildTrack Pro design system (WP3/WP4)

The identity is architectural black/gold/white. The tokens live in `client/src/index.css`
(`:root[data-theme='dark']` and `:root[data-theme='light']`). Pages use the tokens
(`var(--…)`) and the shared classes, never raw hex, except in the always-black brand surfaces.

## Palette

The brand gold is #C9982C (fills and buttons). Text and icon accents are tuned per theme
so that they stay readable (AA contrast).

| Token | Dark | Light | Use |
|---|---|---|---|
| `--accent` | #D4A53C | #8A6516 | Gold text and icons, active nav, focus |
| `--accent-strong` | #E0BC63 | #7A5A12 | Highlights |
| `--accent-deep` | #7A5A12 | #5E450D | Deep gold |
| `--bg-base` | #050505 | #F5F1E8 | Page background |
| `--bg-card` | #0A0A0B | #FFFDF8 | Cards, modals |
| `--bg-surface` | #101012 | #FAF6EE | Raised areas |
| `--bg-elevated` | #17171A | #EFE8DA | Inputs, hovers |
| `--text-1` | #F5F1E8 | #17171A | Primary text (warm white / ink) |
| `--bg-sidebar` | #070708 | #0A0A0B | The sidebar stays black in both themes |

Functional colours (`--green`, `--amber`, `--red`, `--info`, `--violet`) are kept apart from the gold.
They mark status only.

## Type

- **Playfair Display** (`font-display`): page titles, hero figures, brand.
- **Inter**: body text, tables, forms.
- `.eyebrow` is the small uppercase gold label.

## Components

- **Shared classes:** `card`, `hero-card`, `btn-primary`, `btn-secondary`, `icon-btn`, `badge-*`, `input`, `label`, `sidebar-link`, `stat-card`.
- **Brand components:** `BrandMark` (the monogram) and `uiStore` (theme and drawer state).
- **Theme:** chosen in the header or login toggle and stored in `localStorage['bt-theme']`. `public/theme-init.js` applies it before first paint, so the page doesn't flash, and it is CSP-safe.
- **Responsive:** below `lg` the sidebar becomes an off-canvas drawer.

## Exports

- **PDF:** ink and charcoal headers with a gold rule, warm-white label cells, and graphical progress bars.
- **Excel:** a charcoal header row, a gold accent, warm zebra rows, and a gold total row.
- **Presentation PDF:** an ink background with gold accents.
- **Status colours** are kept in all exports.
