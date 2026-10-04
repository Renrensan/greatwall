// What a tunnel's swap means to the user, in the words the convert screens
// have always used: the two screens (the transaction page and the history)
// share this, so they never disagree. The words are the user's view of the
// protocol, and true to it: what the operator does later with what the
// user sold is not the user's wait, so it is not a status.

import { TxPhase } from "./evm/type";

/** How a status is shown: waiting on others, the user's turn, in progress,
 *  done, failed, or closed with nothing lost. */
export type StatusKind = "wait" | "action" | "progress" | "ok" | "fail" | "closed";

export type Status = { kind: StatusKind; label: string; desc: string };

type T = (key: string) => string;

/**
 * The status of a tunnel's swap, or null when the swap is not a tunnel's.
 * `local` is the swap the screen shows (a record from the convert
 * methods, with its `tunnel` link), `partner` the other leg when known.
 * `source` and `destination` are the networks' names.
 */
export function tunnelStatus(
  local: any,
  partner: any | null,
  names: { source: string; destination: string },
  t: T,
  locale: string
): Status | null {
  const link = local?.tunnel;
  if (!link) return null;
  const en = locale === "en";
  const buy = link.leg === "buy" ? local : partner;
  const sell = link.leg === "buy" ? partner : local;

  // The user has the coin: done, whatever the sale's own lock still holds
  // for the operator.
  if (buy?.phase === TxPhase.COMPLETED) return { kind: "ok", label: t("text172"), desc: t("text173") };

  const refundable = en ? `Your deposit can be refunded on ${names.source}.` : `Deposit Anda dapat dikembalikan di ${names.source}.`;
  const depositMade = !!sell || !!link.tunnel.sellId;

  if (link.leg === "sell") {
    // The sale, seen from the source network. The buy's end decides.
    if (local.phase === TxPhase.REFUNDED) return { kind: "closed", label: t("text180"), desc: en ? "Your deposit was returned." : "Deposit Anda telah dikembalikan." };
    if (buy?.phase === TxPhase.OPERATOR_DUTY_EXPIRED && buy.provable)
      return { kind: "action", label: t("text174"), desc: en ? `${t("text175")} Claim on ${names.destination}.` : `${t("text175")} Klaim di ${names.destination}.` };
    if (buy && [TxPhase.USER_ACTION_EXPIRED, TxPhase.OPERATOR_DUTY_EXPIRED, TxPhase.OPERATOR_APPROVAL_EXPIRED, TxPhase.REFUNDED].includes(buy.phase))
      return { kind: "fail", label: t("text167"), desc: en ? `The tunnel closed before the conversion completed. ${refundable}` : `Terowongan ditutup sebelum konversi selesai. ${refundable}` };
    if (local.phase === TxPhase.OPERATOR_DUTY_EXPIRED || local.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED)
      return { kind: "fail", label: t("text167"), desc: t("text171") };
    return { kind: "progress", label: t("text169"), desc: en ? `Converting to ${names.destination}...` : `Mengonversi ke ${names.destination}...` };
  }

  // The buy, seen from the destination network. A deposit that failed on
  // the source ends it too.
  if (sell && (sell.phase === TxPhase.OPERATOR_APPROVAL_EXPIRED || sell.phase === TxPhase.OPERATOR_DUTY_EXPIRED))
    return { kind: "fail", label: t("text167"), desc: en ? `The deposit was not completed. ${refundable}` : `Deposit tidak selesai. ${refundable}` };
  if (sell?.phase === TxPhase.REFUNDED && local.phase !== TxPhase.COMPLETED)
    return { kind: "closed", label: t("text180"), desc: en ? "Your deposit was returned." : "Deposit Anda telah dikembalikan." };
  switch (local.phase) {
    case TxPhase.REFUNDED:
      return { kind: "closed", label: t("text180"), desc: en ? "Cancelled before an operator took it. The fee is returned." : "Dibatalkan sebelum operator mengambilnya. Biayanya dikembalikan." };
    case TxPhase.OPERATOR_APPROVAL_EXPIRED:
      return { kind: "fail", label: t("text157"), desc: t("text158") };
    case TxPhase.WAITING_OPERATOR_APPROVAL:
      return { kind: "wait", label: t("text159"), desc: `${t("text160")} ${names.destination}...` };
    case TxPhase.WAITING_USER_ACTION:
      if (depositMade) return { kind: "progress", label: t("text169"), desc: en ? "Deposit signed. Waiting for Bitcoin..." : "Deposit ditandatangani. Menunggu Bitcoin..." };
      return {
        kind: "action",
        label: t("text161"),
        desc: en ? `Tunnel ready. Sign the deposit on ${names.source}.` : `Terowongan siap. Tandatangani deposit di ${names.source}.`,
      };
    case TxPhase.ACTIVE_WAITING_PROOF:
      if (local.completable) return { kind: "action", label: t("text176"), desc: t("text179") };
      return { kind: "progress", label: t("text169"), desc: en ? "Deposit received. Confirming on Bitcoin..." : "Deposit diterima. Mengonfirmasi di Bitcoin..." };
    case TxPhase.USER_ACTION_EXPIRED:
      return { kind: "fail", label: t("text165"), desc: depositMade ? `${t("text166")} ${refundable}` : t("text166") };
    case TxPhase.OPERATOR_DUTY_EXPIRED:
      // The coin is claimable by the user's own proof (D10) only while the
      // buy still holds it; otherwise the deposit comes back on the source.
      if (local.provable) return { kind: "action", label: t("text174"), desc: t("text175") };
      return { kind: "fail", label: t("text167"), desc: depositMade ? (en ? `The conversion did not complete. ${refundable}` : `Konversi tidak selesai. ${refundable}`) : t("text171") };
    default:
      return { kind: "wait", label: t("text182"), desc: t("text183") };
  }
}
