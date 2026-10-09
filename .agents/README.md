# Agent context — Greatwall

Portable context for AI coding agents. Copy this entire `.agents/` folder into another repository when you want assistants to understand **what Greatwall is** and **how it should look**, without Cursor-specific rules.

In **this** repo, agents should start from the root [AGENTS.md](../AGENTS.md), which points here.

## What to read

| File | Purpose |
|------|---------|
| [product-idea.md](./product-idea.md) | **Start here for product.** Vision, terminology, business rules, user journeys, UX principles. |
| [brand-guidelines.md](./brand-guidelines.md) | **For UI.** Typography (Instrument Serif / BDO Grotesk), warm neutral color rules, logo paths and usage. |

## How to use in another project

1. Copy `.agents/` to the root (or docs path) of the target project.
2. Point your agent at these files in system instructions, `AGENTS.md`, or a project skill — e.g. “Read `.agents/product-idea.md` and `.agents/brand-guidelines.md` before implementing Greatwall UI.”
3. Keep this folder in sync when product or brand rules change (optional Cursor rules in this repo: `greatwall-product.mdc`, `greatwall-brand.mdc`).

## What this folder is not

- Not a full tech stack or implementation guide (see the app codebase for current fonts, theme, and components).
- Wiring fonts in CSS, swapping the navbar logo, or other implementation work lives in the **codebase**—the brand doc states the rules; the repo may lag until aligned.
