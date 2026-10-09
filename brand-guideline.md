# Greatwall — brand guidelines

Document for AI agents and collaborators. Describes **visual identity rules** for typography, color, and logo usage when building Greatwall UI. Not a full design system (spacing, motion, illustrations).

Pair with [product-idea.md](./product-idea.md) for product semantics and copy.

---

## One-line summary

Greatwall uses a **warm neutral** palette (cream backgrounds, charcoal typography), **Instrument Serif** for headlines and hierarchy, **BDO Grotesk** for body and UI copy, and **two canonical logo SVGs** (full lockup vs icon-only).

---

## Theme

The product targets **light mode only** for Greatwall-branded chrome. Design for **light, warm backgrounds**; do not add dark-theme brand variants or invert logos for dark UI in new work.

Legacy integrator / dapp-hub surfaces may still use older styling until migrated; **new** Greatwall marketing, index, and mint experiences should follow this document.

---

## Typography

### Headlines — Google Fonts

- [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) — load from Google Fonts.

### Body & UI — self-hosted

- **BDO Grotesk** — `.woff2` files under `src/assets/fonts/bdo-grotesk/` (Light, Regular, Medium, DemiBold, Bold, ExtraBold, Black).

### Rules

| Role | Font family | Use for |
|------|-------------|---------|
| **Headlines & hierarchy** | **Instrument Serif** | Page titles, section headers (`h1`–`h3`), hero lines, modal titles, marketing headlines, and any **live text** spelling “Greatwall” (not the paths baked into the logo SVG) |
| **Body & UI copy** | **BDO Grotesk** | Paragraphs, labels, buttons, inputs, lists, tables, helper text, long strings |

Default weights unless a design spec says otherwise:

- Body: **Regular** or **Medium**
- Headlines: **Regular** (Instrument Serif is a single-weight family on Google Fonts; use font-style **italic** only when design specifies)
- Buttons & emphasis: **Medium**, **DemiBold**, or **Bold**

### CSS / React (when implementing in code)

```css
font-family: "Instrument Serif", serif; /* headlines */
font-family: "BDO Grotesk", sans-serif; /* body & UI */
```

- Instrument Serif: `next/font/google` or Google Fonts CSS2 (`Instrument+Serif`).
- BDO Grotesk: `next/font/local` pointing at `src/assets/fonts/bdo-grotesk/*.woff2`, or equivalent `@font-face` in global CSS.
- Prefer CSS variables such as `--font-serif` (headlines) and `--font-sans` / `--font-bdo` (body) mapped in global theme config.

### Do not

- Use TASA Explorer, TASA Orbiter, Space Grotesk, Inter, or other generic faces for **new** Greatwall-branded surfaces when following these guidelines.
- Set the wordmark in a different typeface when the full lockup SVG is available.

---

## Color

Greatwall uses a **fixed warm neutral palette**—no decorative brand accent colors (no purple/green gradient chrome). The identity stays neutral so it can sit alongside partner palettes in co-branded contexts; **chain**, **wallet**, and **status** colors remain functional only (see below).

### Base palette

| Swatch | Hex | Typical use |
|--------|-----|-------------|
| Charcoal | `#181818` | Primary text, primary button fill, logo on light surfaces |
| Warm dark | `#2F2C25` | Secondary emphasis, alternate button fill, strong borders |
| Muted gray | `#6B6B6B` | Secondary text, placeholders, de-emphasized UI |
| White | `#FFFFFF` | Text on dark buttons, inverse copy |
| Warm off-white | `#FBF9F1` | Tertiary surfaces, subtle sections, light button fill |
| Page cream | `#F1EADD` | **Page background** |

### Brand tokens (light mode)

| Role | Value |
|------|--------|
| **Page background** | `#F1EADD` |
| **Card, input, elevated surface** | `#FEFAF3` |
| **Primary text & brand icons** | `#181818` |
| **Secondary text** | `#6B6B6B` |
| **Borders & dividers** | Charcoal or warm dark at low opacity (e.g. `#181818` / `#2F2C25` at 10–20% opacity), or `#6B6B6B` at low opacity on cream surfaces |

### Actionable buttons

Use **BDO Grotesk** for button labels. Prefer these fills for CTAs (mix across the product; roughly **primary-heavy**, with lighter variants for secondary actions):

| Variant | Background | Label |
|---------|------------|--------|
| **Primary** | `#181818` | `#FFFFFF` |
| **Secondary** | `#2F2C25` | `#FFFFFF` |
| **Tertiary / soft** | `#FBF9F1` | `#181818` |

Do **not** introduce new decorative Greatwall accent colors on headers, marketing blocks, or primary buttons unless product explicitly requires an exception.

### Functional color (not brand accent)

Existing app patterns may use **chain**, **wallet**, or **status** colors (e.g. network badges, success, warning, pending). These are **functional**, not Greatwall brand accents. Use them only where the product needs to distinguish networks or transaction state—not as general Greatwall chrome.

---

## Logo usage

Canonical assets live under `src/assets/logo/` in this repository.

| Asset | Path | When to use |
|-------|------|-------------|
| **Full lockup** (mark + “Greatwall” wordmark) | `src/assets/logo/greatwall-logo-with-name.svg` | **Top navigation**, marketing header, anywhere the full brand name should appear |
| **Icon mark** (symbol only) | `src/assets/logo/greatwall-logo-icon-only.svg` | Favicon, compact slots, collapsed nav, splash/loading when the wordmark does not fit |

### Asset notes

- **Full lockup**: viewBox `0 0 490 69` — horizontal mark plus “Greatwall” lettering; fills are **black** (reads as `#181818` on cream backgrounds).
- **Icon only**: viewBox `0 0 58 71` — vertical mark only; fills are **black**.

### Implementation (Next.js)

- Import from `@/assets/logo/greatwall-logo-with-name.svg` or `@/assets/logo/greatwall-logo-icon-only.svg`.
- Use `next/image` or an SVG component; **preserve aspect ratio** (e.g. fixed height in nav, `width: auto`).
- Place the **full lockup** in the **top nav** by default.

### Do not

- Stretch the logo disproportionately or recolor fills for a “brand accent.”
- Rebuild the wordmark in another font when the lockup SVG exists.
- Use legacy `src/assets/logos.svg` for **new** Greatwall nav or header work—use the canonical paths above.

---

## Checklist: new component following brand

- [ ] Headlines use **Instrument Serif**; body and controls use **BDO Grotesk**
- [ ] Page background **#F1EADD**; cards/inputs **#FEFAF3**; text **#181818** / **#6B6B6B**
- [ ] Buttons use palette fills (**#181818**, **#2F2C25**, **#FBF9F1**)—no new decorative accent chrome
- [ ] **Light** warm backgrounds; no dark-mode brand treatment
- [ ] Logo: **full lockup** in top nav; **icon-only** only when space requires it
- [ ] Functional colors only where needed (network, status)—not as Greatwall identity

---

## Out of scope for this document

Spacing grid, motion, illustration style, detailed component specs, and on-chain UI styling. For **what** the product does, see [product-idea.md](./product-idea.md).
