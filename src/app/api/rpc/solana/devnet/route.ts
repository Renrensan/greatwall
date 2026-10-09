import { forward } from "../../forward";

// The network's RPC, through the shared forwarder (../../forward.ts): Alchemy first, the
// public devnet endpoint when Alchemy stays busy.
export async function POST(request: Request) {
  return forward(request, process.env.SOLANA_DEVNET_RPC_URL, ["https://api.devnet.solana.com"]);
}
