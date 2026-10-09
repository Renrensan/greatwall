// The legal pages' shared look (Privacy Policy, Cookies Policy, Terms of
// Use): a large title with its date, a contents list beside the text on
// wide screens, and a readable column.

import Link from "next/link";

export const LEGAL_UPDATED = "9 October 2026";
export const LEGAL_EMAIL = "support@greatwall.finance";

export function LegalShell({
  title,
  intro,
  toc,
  base,
  current,
  children,
}: {
  title: string;
  intro: React.ReactNode;
  toc: { id: string; title: string }[];
  /** `/{locale}/{network}`: where the sibling pages live. */
  base: string;
  current: "privacy" | "cookies" | "terms";
  children: React.ReactNode;
}) {
  const pages = [
    { id: "terms", label: "Terms of Use" },
    { id: "privacy", label: "Privacy Policy" },
    { id: "cookies", label: "Cookies Policy" },
  ] as const;
  return (
    <div className="w-full max-w-6xl mx-auto py-10 pb-32 md:pb-16 flex flex-col gap-10">
      <header className="flex flex-col gap-3 max-w-[65ch]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-60">Last updated {LEGAL_UPDATED}</span>
        <h1 className="font-display text-5xl sm:text-7xl leading-[1.02]">{title}</h1>
        <div className="text-base opacity-80 leading-relaxed">{intro}</div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-10 items-start">
        <nav aria-label="On this page" className="hidden lg:flex flex-col gap-1 sticky top-28 text-sm">
          {toc.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="py-1 opacity-70 hover:opacity-100 transition-opacity">
              {s.title}
            </a>
          ))}
          <div className="h-px bg-ink/10 my-3" />
          {pages
            .filter((p) => p.id !== current)
            .map((p) => (
              <Link key={p.id} href={`${base}/${p.id}`} className="py-1 font-semibold opacity-80 hover:opacity-100 transition-opacity">
                {p.label}
              </Link>
            ))}
        </nav>
        <article className="flex flex-col gap-12 max-w-[68ch] text-[15px] leading-relaxed">{children}</article>
      </div>
    </div>
  );
}

export function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-display text-3xl sm:text-4xl leading-tight scroll-mt-28" style={{ textWrap: "balance" }}>
      {children}
    </h2>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-bold pt-2">{children}</h3>;
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-ink/40">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function Summary({ id = "summary", items }: { id?: string; items: React.ReactNode[] }) {
  return (
    <section className="rounded-2xl bg-paper border border-ink/10 p-6 flex flex-col gap-4" aria-labelledby={id}>
      <h2 id={id} className="text-lg font-bold scroll-mt-28">
        Summary
      </h2>
      <List items={items} />
    </section>
  );
}

export function Contact() {
  return (
    <dl className="rounded-2xl bg-paper border border-ink/10 p-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
      <dt className="opacity-60">Email</dt>
      <dd>
        <a href={`mailto:${LEGAL_EMAIL}`} className="font-semibold underline underline-offset-2">
          {LEGAL_EMAIL}
        </a>
      </dd>
      <dt className="opacity-60">Website</dt>
      <dd>
        <a href="https://greatwall.finance" className="font-semibold underline underline-offset-2">
          greatwall.finance
        </a>
      </dd>
    </dl>
  );
}

/** A table that scrolls sideways on its own on a narrow screen. */
export function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/10">
      <table className="w-full text-sm text-left">
        <thead className="bg-paper">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => (
                <td key={j} className="px-4 py-3">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
