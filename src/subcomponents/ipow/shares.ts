// An index's composition as shares of one token's value, in 5% steps that
// always add up to 100%: 20 units of 5%. The Create page sets each part's
// share, and the amounts follow from the token's value and each price.
//
// - The first part takes everything; a part added takes an equal share,
//   taken from the others in proportion.
// - Changing a part's share moves the others in proportion, so the total
//   stays 100%. A locked part keeps its share; only unlocked parts move.
// - A part removed hands its share back to the others in proportion.
// - Every part keeps at least one step (5%): a part of nothing is no part.

export const STEP = 5;
export const UNITS = 100 / STEP;

export type Shares = Record<string, number>;

const sum = (s: Shares, ids: string[]) => ids.reduce((a, id) => a + (s[id] ?? 0), 0);

/** Moves `delta` units into (or, negative, out of) `pool`, in proportion to
 *  what each holds, each keeping at least one. Returns what could not move. */
function shift(s: Shares, pool: string[], delta: number): number {
  if (!pool.length || delta === 0) return delta;
  const total = sum(s, pool);
  // Each one's exact part, floored toward keeping everyone at one unit or more.
  const exact = pool.map((id) => (total > 0 ? (delta * (s[id] ?? 0)) / total : delta / pool.length));
  const moved = exact.map((x) => (delta > 0 ? Math.floor(x) : Math.ceil(x)));
  pool.forEach((id, i) => {
    s[id] = Math.max(1, (s[id] ?? 0) + moved[i]);
  });
  // What rounding (or the floor of one unit) left, one unit at a time: to
  // the largest when adding, from the largest above one when taking.
  let left = delta - (sum(s, pool) - total);
  while (left !== 0) {
    const order = [...pool].sort((a, b) => (s[b] ?? 0) - (s[a] ?? 0));
    const target = left > 0 ? order[0] : order.find((id) => (s[id] ?? 0) > 1);
    if (!target) break;
    s[target] += left > 0 ? 1 : -1;
    left += left > 0 ? -1 : 1;
  }
  return left;
}

/** The shares of the parts `ids`, from those before: a part gone hands its
 *  share back, a part new takes an equal share, a part re-picked in place
 *  keeps the share of the one it replaced. */
export function reconcile(prev: Shares, ids: string[], locked: Set<string>): Shares {
  const gone = Object.keys(prev).filter((id) => !ids.includes(id));
  const added = ids.filter((id) => !(id in prev));
  const s: Shares = {};
  for (const id of ids) if (id in prev) s[id] = prev[id];
  // One replaced by another (a part re-picked): the share carries over.
  if (gone.length === 1 && added.length === 1) {
    s[added[0]] = prev[gone[0]];
    return ids.reduce((o, id) => ({ ...o, [id]: s[id] }), {} as Shares);
  }
  const kept = ids.filter((id) => id in prev);
  // What the parts gone held goes back to the others.
  const freed = gone.reduce((a, id) => a + prev[id], 0);
  if (freed && kept.length) {
    const open = kept.filter((id) => !locked.has(id));
    const left = shift(s, open.length ? open : kept, freed);
    if (left && open.length) shift(s, kept, left);
  }
  // Each new part an equal share, taken from the others.
  for (const id of added) {
    const n = Object.keys(s).length + 1;
    const others = Object.keys(s);
    if (!others.length) {
      s[id] = UNITS;
      continue;
    }
    const want = Math.max(1, Math.round(UNITS / n));
    const open = others.filter((o) => !locked.has(o));
    s[id] = 0;
    // From the unlocked parts first; then, if they cannot give it all, from
    // any part above one step.
    const short = -shift(s, open, -want);
    s[id] = want - short;
    if (short) {
      const rest = -shift(s, others, -short);
      s[id] += short - rest;
    }
    if (s[id] < 1) s[id] = 1;
  }
  return normalize(s, ids, locked);
}

/** Part `id` at `units`, the unlocked others moving to keep the total: at
 *  least one step, and at most what the locked parts and one step for each
 *  other unlocked part leave. */
export function setShare(prev: Shares, id: string, units: number, locked: Set<string>): Shares {
  const ids = Object.keys(prev);
  const others = ids.filter((o) => o !== id);
  const open = others.filter((o) => !locked.has(o));
  const fixed = sum(prev, others.filter((o) => locked.has(o)));
  const max = UNITS - fixed - open.length;
  const target = Math.min(Math.max(1, Math.round(units)), Math.max(1, max));
  const s = { ...prev };
  if (!open.length) return s; // Nothing can give or take: it stays.
  const delta = target - (s[id] ?? 0);
  s[id] = target;
  shift(s, open, -delta);
  return normalize(s, ids, locked);
}

/** Exactly 100%: any difference to or from the largest unlocked part. */
function normalize(s: Shares, ids: string[], locked: Set<string>): Shares {
  const diff = UNITS - sum(s, ids);
  if (diff) {
    const open = ids.filter((id) => !locked.has(id));
    shift(s, open.length ? open : ids, diff);
  }
  return s;
}
