import { forward } from "../../forward";

// The network's RPC, through the shared forwarder (../../forward.ts).
export async function POST(request: Request) {
  return forward(request, process.env.HYPERLIQUID_TESTNET_RPC_URL);
}
