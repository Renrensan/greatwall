// Pay with ZEC: makes an order (docs/zec-lane.md).
//
//   POST /api/zec/order {chain, index, amount, recipient}
//     chain: "solana" (the default) or an EVM test network; index: the
//     basket's address on Solana, its key on an EVM network; recipient: an
//     address on that network
//   -> {id, memo, address, zat, zec, uri, expiresAt, usd, confirmations}
//
// `uri` is the ZIP-321 payment request a phone wallet reads from a QR code.

import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { isAddress } from "ethers";

import { refused } from "../../faucet/limits";
import { confirmationsFor, createOrder, laneInfo } from "../lane";
import { EVM_CHAINS } from "../indexes";

export const runtime = "nodejs";

const base64url = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function POST(req: Request) {
  const no = refused(req);
  if (no) return no;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const [chain, index, amount, recipient] = [b.chain ?? "solana", b.index, b.amount, b.recipient].map((v) => (typeof v === "string" ? v.trim() : ""));
  if (chain !== "solana" && !EVM_CHAINS.includes(chain)) return NextResponse.json({ error: "Not a network the lane sells on" }, { status: 400 });
  const goodRecipient =
    chain === "solana"
      ? (() => {
          try {
            return PublicKey.isOnCurve(new PublicKey(recipient).toBytes());
          } catch {
            return false;
          }
        })()
      : isAddress(recipient) && !/^0x0{40}$/i.test(recipient);
  if (!goodRecipient) return NextResponse.json({ error: `Enter your ${chain === "solana" ? "Solana" : "0x"} address to receive the index on` }, { status: 400 });
  try {
    const [info, o] = await Promise.all([laneInfo(), createOrder({ chain, index, amount, recipient })]);
    const zec = (o.zat / 1e8).toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    const uri = `zcash:${info.address}?amount=${zec}&memo=${base64url(o.memo)}`;
    return NextResponse.json({ id: o.id, memo: o.memo, address: info.address, zat: o.zat, zec, uri, expiresAt: o.expiresAt, usd: o.usd, confirmations: confirmationsFor(o.usd) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
