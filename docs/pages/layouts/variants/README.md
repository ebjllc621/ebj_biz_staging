# Homepage Layout Variants

**Created**: 2026-04-03
**Admin Access**: Settings > Layouts (`/admin/settings/layouts`)
**Preview Files**: `public/layouts/variant-{1-5}.html`

## Overview

5 visual variants of the Bizconekt homepage, each progressively departing from the base palette and aesthetic. All variants are self-contained HTML files with inline CSS, referencing the branding logos at `public/uploads/site/branding/`.

## Variants

| # | Name | Typography | Aesthetic | Departure Level |
|---|------|-----------|-----------|-----------------|
| 0 | Base Layout | Inter | Clean corporate | Baseline (current production) |
| 1 | Warm Editorial | Poppins + Lora | Editorial magazine | Subtle |
| 2 | Bold Geometry | Poppins + Space Mono | Geometric corporate | Moderate |
| 3 | Organic Flow | DM Serif Display + DM Sans | Organic modern | Significant |
| 4 | Brutalist Editorial | Instrument Serif + IBM Plex Mono | Brutalist editorial | Major |
| 5 | Immersive Dark | Playfair Display + Outfit | Dark luxury tech | Maximum |

## Variant Details

### Variant 1: Warm Editorial
- **File**: `public/layouts/variant-1.html`
- **Skills Used**: `brand-guidelines-skill.md` (Poppins/Lora typography, warm cream palette)
- **Design Rationale**: Minimal departure from base. Replaces Inter with Poppins headings + Lora body text. Shifts backgrounds from pure white to warm cream (#faf9f5). Introduces editorial asymmetry in the hero. Feature cards have warm gray borders that highlight to orange on hover.
- **Palette**: Navy #002641, Orange #ed6437, Cream #faf9f5, Warm Gray #e8e6dc

### Variant 2: Bold Geometry
- **File**: `public/layouts/variant-2.html`
- **Skills Used**: `canvas-design-skill.md` (geometric patterns, structured composition), `frontend-design-skill.md` (spatial composition)
- **Design Rationale**: Introduces angular clip-paths on buttons and stat cards. Crosshatch SVG pattern in hero background. Numbered features (01-04) with monospaced labels. Dark navy hero with colored top-borders on stat cards. Angled section dividers.
- **Palette**: Navy #002641, Orange #ed6437, Teal #0d7377, Cream #f7f5ef

### Variant 3: Organic Flow
- **File**: `public/layouts/variant-3.html`
- **Skills Used**: `frontend-design-skill.md` (motion, organic aesthetic, gradient meshes), `brand-guidelines-skill.md` (accent color expansion)
- **Design Rationale**: Full organic treatment with blurred gradient blobs as background elements. Pill-shaped buttons with gradient fills. DM Serif Display for headings gives an approachable elegance. Expands color palette to include teal (#2d8f8f), sage (#788c5d), and sky (#6a9bcc). Floating logo orb with CSS animation. Rounded corners everywhere.
- **Palette**: Navy #002641, Orange #ed6437, Teal #2d8f8f, Sage #788c5d

### Variant 4: Brutalist Editorial
- **File**: `public/layouts/variant-4.html`
- **Skills Used**: `canvas-design-skill.md` (minimal clinical typography, systematic reference), `frontend-design-skill.md` (brutalist aesthetic, grid-breaking)
- **Design Rationale**: Major aesthetic departure. Exposed 1px grid borders define all sections. Instrument Serif at 96px for hero headline. IBM Plex Mono for all labels/navigation. Listings displayed as horizontal rows (not cards). Paper texture background (#f5f3ed) with SVG grain overlay. No rounded corners anywhere. Color reduced to near-monochrome with orange as sole accent.
- **Palette**: Black #0a0a0a, Orange #ed6437, Paper #f5f3ed, Border #ddd

### Variant 5: Immersive Dark
- **File**: `public/layouts/variant-5.html`
- **Skills Used**: All four skills — `brand-guidelines-skill.md` (color theory), `canvas-design-skill.md` (dense visual composition), `frontend-design-skill.md` (motion, glassmorphism, dramatic shadows), `web-artifacts-builder-skill.md` (production-grade component patterns)
- **Design Rationale**: Maximum creative departure. Full dark background (#0c0c0c) with SVG noise texture overlay. Multiple blurred gradient orbs create ambient atmosphere. CSS grid-line background with radial mask. Logo has pulsing glow animation. Stats use multi-color accents (orange, teal, blue, purple). Cards have colored top-borders that appear on hover. CTA section uses a large blurred orange glow. Glassmorphism nav bar.
- **Palette**: Dark #0c0c0c, Orange #ed6437, Teal #2dd4bf, Blue #60a5fa

## File Structure

```
public/layouts/
  variant-1.html    # Warm Editorial
  variant-2.html    # Bold Geometry
  variant-3.html    # Organic Flow
  variant-4.html    # Brutalist Editorial
  variant-5.html    # Immersive Dark

src/app/admin/settings/layouts/
  page.tsx           # Admin preview page

src/config/adminMenu.ts  # Updated with Layouts menu item
```

## Admin Page Features

- Card grid showing all 6 layouts (base + 5 variants) with color palette strips
- Metadata display: typography, aesthetic, departure level, palette swatches
- Click to expand with iframe preview
- "Open in New Tab" for full-screen viewing
- Mobile responsive layout

## Branding Assets Used

- `public/uploads/site/branding/logo-icon.png` — Icon mark (used in hero sections, nav)
- `public/uploads/site/branding/namelogo-horizontal.png` — Full wordmark (used in nav, footer)
