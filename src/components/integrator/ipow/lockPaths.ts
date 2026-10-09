// Lock's public addresses. The pages behind them are the "bridge" app's
// (src/app/[locale]/[network]/[app]/…, kept as they are); src/proxy.ts
// rewrites these to them, and sends the old /bridge/… addresses here:
//   /{locale}/{network}/lock                    Lock
//   /{locale}/{network}/unlock                  Unlock
//   /{locale}/{network}/lock/history            History
//   /{locale}/{network}/lock/transaction/{id}   one lock or unlock

export type LockSection = "lock" | "unlock" | "history";

export function lockPath(locale: string, network: string, section: LockSection | string = "lock"): string {
  if (section === "unlock" || section === "send") return `/${locale}/${network}/unlock`;
  if (section === "history") return `/${locale}/${network}/lock/history`;
  return `/${locale}/${network}/lock`;
}

export function lockTxPath(locale: string, network: string, id: string): string {
  return `/${locale}/${network}/lock/transaction/${id}`;
}
