# Greatwall — product idea

Document for AI agents and collaborators. Describes **what the product is** and **how it should behave**, not implementation details.

---

## One-line summary

Greatwall lets people publish **immutable, public indexes** — plans whose value is backed by **ingredients** (e.g. tokenized stocks such as TeslaX, GoogleX). Each index has **one index token**. To join a creator’s index, users **mint** through the protocol or **buy** the index token directly when supply already exists. Mint uses a **mint network** chosen from options the **creator configured**; no one can one-click **copy** an index as their own new token.

> **Terminology:** Early drafts used **“recipe”** as friendly copy. The canonical product term is **Index**.

---

## Vision

Users create **Indexes** — transparent allocation plans backed by tokenized stocks and similar assets. Each index maps to **one index token** (e.g. `$MEGATECH`). Users **mint** to receive that token on a **mint network** (e.g. Solana or Ethereum), subject to what the creator enabled for that index. All indexes are public.

**Creating an index:** define the index → set **ingredients** (assets, source networks, weights) → publish → **mint** (with preparation that depends on Case A vs Case B below).

**Joining someone else’s index:** **mint** (protocol path with Case A or B prep) or **buy** (acquire existing index token on a supported market/network) — same **index token**, same published plan; do not fork their index into a new token in one step.

---

## Who it is for

- **Creators** — investors, analysts, or public figures who publish a named, transparent index others can **mint into or buy**. Creator identity is **transparent** (real name / KOL-style trust), not pseudonymous-by-default.
- **Followers** — people who already trust a **specific creator** and want to align with **that exact published index** (**mint** or **buy** the creator’s index token, not a fork).
- **Independent investment seekers** — people looking for the **best investment composition** for their goals; they **discover and compare** public indexes (ingredients, weights, networks, creator track record), then **mint or buy** into a creator’s index whose thesis and allocation fit them—without building their own index.
- **Independent builders** — people who want **their own** tokenized plan and brand; they **create a new index from scratch**, not a clone of an existing one.

**Followers vs independent investment seekers:** both join someone else’s index via **mint or buy**. Followers often start from **creator loyalty**; independent investment seekers start from **composition and fit** (then may follow that creator’s future indexes).

---

## Terminology

| Term | Definition |
|------|------------|
| **Index** | Fixed allocation backed by ingredients. **Immutable** after creation. **One index = one index token** (one logical product). |
| **Index token** | The mintable asset tied to an index (e.g. `$MEGATECH`). |
| **Ingredient** | One line in an index: asset (e.g. TeslaX, GoogleX) + **source network** where that backing token lives + **weight** (%). Weights sum to 100%. Ingredients **back the value** of the index. |
| **Source network** | The network where a given **ingredient** must be sourced or satisfied (per ingredient). |
| **Mint network** | The network on which the user **mints the index token** at mint time. |
| **Allowed mint networks** | The set of mint networks a minter may choose from — defined by **how the creator set up the index ingredients**, not the global list of chains Greatwall supports. |
| **Mint** | Complete index preparation (Case A or B) → protocol steps → receive the **index token** on the chosen **mint network** (creates or increases supply via the protocol). |
| **Buy** | **Purchase existing** index token supply (e.g. swap or market on a supported venue) to join the same index **without** running the mint / Case A–B preparation flow. |
| **Creator** | User who created the index. Identity is transparent. |

---

## Join an index: mint or buy

Users who want exposure to a **creator’s index** can enter in two ways. Both target the **same index token** for **that** index — not a new index and not a one-click fork.

| Path | What the user does | Preparation | Typical when |
|------|-------------------|-------------|--------------|
| **Mint** | Use Greatwall **protocol** to mint the index token on an **allowed mint network** | **Case A or B** (see below) | User wants to enter **through the index** (fresh mint, full composition logic). |
| **Buy** | **Acquire the index token** that already exists (market, DEX, or other supported venue — implementation-specific) | Wallet and payment asset on the **network where they buy**; **no** Case A/B ingredient prep for the buy path itself | Index token already has **circulating supply** and **liquidity**; user wants a **direct, simple** entry. |

**Rules for agents:**

- **Mint** and **Buy** are both valid **join** actions on index detail; they are **not** “Copy index.”
- **Buy** does **not** create a duplicate index or a new token symbol for the same plan.
- **Mint** still requires Case A/B and **allowed mint networks** when the user chooses mint.
- **Buy** is only available where the **index token is listed and tradable** (usually on one of the networks where that token exists — often an **allowed mint network** after prior mints).
- Exact venue (in-app swap vs external DEX) is **out of scope** here; product UI should still label the user intent clearly: **Mint** vs **Buy**.

---

## Index setup: Case A vs Case B

How users prepare before mint depends on whether **all ingredients share one source network** or **span multiple networks**.

### Case A — Single-network index (all ingredients on one chain)

All ingredients use the **same source network** (e.g. everything on **Solana**).

**Example:**

| Ingredient | Source network | Weight |
|------------|----------------|--------|
| TeslaX | Solana | 50% |
| GoogleX | Solana | 50% |

**Minter preparation:**

- The minter does **not** need to already hold each ingredient token (TeslaX, GoogleX) separately.
- They supply **funds on that network** (e.g. **SOL**, or other Solana assets the protocol accepts).

**Protocol behavior (product level):**

- Greatwall’s **abstraction / protocol** on that network uses what the user brings to **acquire the index’s ingredient exposure** and **mint** the **index token** on an **allowed mint network** for this index (for this pattern, typically the same network, e.g. Solana).

**UX for agents:** Do **not** ask users to manually pre-buy every ingredient token in Case A unless product explicitly adds an optional manual path.

### Case B — Multi-network index (ingredients on different chains)

Ingredients sit on **two or more source networks**.

**Example:**

| Ingredient | Source network | Weight |
|------------|----------------|--------|
| TeslaX | Solana | 50% |
| GoogleX | Ethereum | 50% |

**Minter preparation:**

- The minter must **hold or provide** the **actual ingredient tokens on each required source network** before mint can proceed.
- **Different networks → different wallets/accounts** (e.g. Solana wallet + Ethereum wallet).

**Protocol behavior (product level):**

- After required ingredient tokens are **provided** on each network, Greatwall protocol runs the next steps and **mints** the **index token** on the **mint network the user selected** (from allowed options).

**UX for agents:** Show a **prep checklist** per network; never imply a single wallet is enough for Case B.

### Choosing Case A vs Case B

Case A and Case B are **not separate products**. The creator **defines ingredients and their source networks** when building the index; that definition determines which case applies for every later **mint** (creator and followers). **Buy** does not re-run Case A/B unless product explicitly combines flows.

---

## Mint network choice

At **mint** time, the user **chooses which network to mint the index token on** (e.g. Solana or Ethereum).

**Rule:** Choices are limited to **allowed mint networks** — those the **creator configured** when setting up the index ingredients (e.g. if the creator enabled both Solana and Ethereum mint paths, the minter may pick either; if only Solana, mint on Solana).

| Concept | Rule |
|---------|------|
| **Allowed mint networks** | Set by the creator’s index setup; minter cannot pick arbitrary chains. |
| **Mint network** | User-selected at mint, from the allowed set. |
| **Source network (per ingredient)** | Where each backing token must be satisfied; independent of mint network label in UI — show both clearly. |
| **What the minter receives (primary)** | The **index token** on the chosen **mint network**, representing the immutable public index. |

UI and copy must distinguish **mint network** from each ingredient’s **source network**.

---

## Business rules

1. **One index = one index token** — created by one user.
2. **Immutable** — indexes cannot be edited after creation (future: enforced on-chain).
3. **Transparent** — all indexes are public; everyone sees creator, name, and full ingredient list.
4. **Creator minting** — the creator can mint their own index (first time and repeat), with the same Case A / Case B preparation as followers.
5. **Others can join** — other users can **mint** (Case A/B + allowed mint networks) or **buy** existing index token supply into the **same** index (join the same plan).
6. **No copy/fork** — no one-click “Copy index”. To own a **new** token, manually create a **new** index from scratch.
7. **Cross-network ingredients** — allowed (Case B); **per-network preparation** is required before mint.

---

## Join vs copy (fork)

This distinction is core to the product and must be reflected in UX (e.g. **Mint** and **Buy** on index detail, **no Copy** / fork action).

| Action | Allowed? | Meaning |
|--------|----------|---------|
| **Mint** from someone else’s index | **Yes** | Protocol path; receive the **index token**; join the same published plan. |
| **Buy** someone else’s index token | **Yes** | Market path; acquire existing **index token**; join the same published plan. |
| One-click copy/fork index | **No** | Cannot duplicate their allocation as **your** new index token in one step. |

---

## User journeys (product level)

### Creator — publish an index

1. Create the **index** (name, metadata).
2. Add **ingredients** (assets, **source networks**, weights until 100%) — this defines **Case A or B** and **allowed mint networks**.
3. Review — warn that the index is **immutable** and cannot be edited after creation.
4. **Mint:** choose **mint network** from allowed options; satisfy **Case A** (single-network funds, e.g. SOL on Solana) or **Case B** (ingredient tokens on each source network); complete mint.

### Follower or independent investment seeker — join an index

1. Browse and compare public indexes (filters: creator, mint networks, stocks in mix, allocation, Case A vs B, etc.) — especially important for **independent investment seekers** choosing the best composition.
2. Index detail: creator, token symbol, **allowed mint networks**, full ingredients table with **source network** per row, and whether flow is **Case A or B**.
3. **Join:** choose **Mint** or **Buy**.
   - **Mint:** same preparation as creator → choose **mint network** from allowed options → receive `$SYMBOL` on `{mintNetwork}`.
   - **Buy:** acquire `$SYMBOL` on a supported network/venue where the token trades (no Case A/B prep for the buy path itself).

### Builder — own a new plan

Same as creator flow. **Not** a fork of an existing index token.

---

## UX and copy principles

Agents implementing UI or flows should:

- Use **Index** as the canonical term (not “recipe”) in product UI and specs unless marketing explicitly uses friendlier wording.
- Show **mint network** (and allowed options) separately from each ingredient’s **source network**.
- On index detail, offer **Mint** and **Buy** where product supports them; explain that both join the **same** index token.
- On mint: e.g. “You will receive `$SYMBOL` on {mintNetwork}.”
- On buy: e.g. “Purchase `$SYMBOL` on {network}” — no ingredient prep checklist unless the user switches to mint.
- **Case A:** e.g. “All ingredients on Solana — bring SOL (or supported Solana funds); the protocol handles acquiring exposure and minting.”
- **Case B:** e.g. “Provide TeslaX on Solana and GoogleX on Ethereum in the correct wallets before minting.”
- On create review: stress **immutability**.
- Do **not** offer one-click duplicate/fork of another user’s index.
- Do **not** imply minters can choose any chain — only **allowed mint networks** from the creator’s setup.

---

## Worked examples

### Example 1 — Case A (single network)

**Index name:** Mega Tech  
**Index token:** `$MEGATECH`  
**Allowed mint networks:** Solana (example)

| Ingredient | Source network | Weight |
|------------|----------------|--------|
| TeslaX | Solana | 50% |
| GoogleX | Solana | 50% |

Alice **mints** with **SOL on Solana**; the protocol automates the ingredient leg and she receives **`$MEGATECH` on Solana**. Bob **mints** the same way. Dave **buys** `$MEGATECH` on a Solana market instead of minting — same index, no fork. Carol cannot one-click create her own copy of Alice’s index — she must define a **new** index manually.

### Example 2 — Case B (multi-network)

**Index name:** Cross-chain Tech  
**Index token:** `$CROSSTECH`  
**Allowed mint networks:** Solana, Ethereum (creator enabled both)

| Ingredient | Source network | Weight |
|------------|----------------|--------|
| TeslaX | Solana | 50% |
| GoogleX | Ethereum | 50% |

Alice holds TeslaX in a Solana wallet and GoogleX in an Ethereum wallet, then chooses to mint **`$CROSSTECH` on Solana** (or Ethereum, if allowed). Bob follows the **same ingredient prep** and may choose a different **allowed mint network**. UI treats **one index**; mint network selects where the index token is received.

---

## Out of scope for this document

Pricing, fees, compliance, custody, and exact on-chain mechanics are not specified here. This file defines **product semantics and rules** only.
