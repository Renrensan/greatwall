# Greatwall — instructions for coding agents

This repository is the **Greatwall client** (Next.js, TypeScript, Tailwind). Before implementing features or UI, read the product and brand context below.

## Required reading

| When                                                            | Read first                                               |
| --------------------------------------------------------------- | -------------------------------------------------------- |
| Any Greatwall feature (indexes, mint, flows, copy, terminology) | [.agents/product-idea.md](.agents/product-idea.md)         |
| Any UI component, layout, styling, or logo                      | [.agents/brand-guidelines.md](.agents/brand-guidelines.md) |

For UI work, read **both** files: product rules define behavior and language; brand rules define typography (Instrument Serif / BDO Grotesk), warm neutral palette, logo assets, and light-mode-only presentation.

Overview of the `.agents/` folder: [.agents/README.md](.agents/README.md).

## Quick rules (do not contradict the docs above)

- **Product:** One index = one index token; indexes are immutable and public; join via **mint** (Case A/B, creator-allowed mint network) or **buy** (existing token supply); no one-click copy/fork of an index.
- **Brand:** Warm neutral palette and Instrument Serif / BDO Grotesk on new Greatwall chrome; use canonical logos under `src/assets/logo/` (full lockup in top nav).
- **Codebase:** Implementation may lag the docs (e.g. fonts in `globals.css`); new work should follow `.agents/` specs unless a human explicitly overrides.
