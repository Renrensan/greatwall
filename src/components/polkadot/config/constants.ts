import { PolkadotWalletType } from "./type";

export const IPOW_NETWORK_ID = 4;

export const POLKADOT_APP_NAME = "Paradapp";

/** Asset Hub's existential deposit — a free balance below this reaps the account. */
export const POLKADOT_EXISTENTIAL_DEPOSIT = 0.01;

export const EXISTENTIAL_DEPOSIT_BUFFER = 1.1;

/** Extensions this dapp knows how to connect to, keyed by their window.injectedWeb3 name. */
export const POLKADOT_WALLETS: { id: PolkadotWalletType; name: string }[] = [
  { id: "talisman", name: "Talisman" },
  { id: "subwallet-js", name: "SubWallet" },
];

/**
 * ipow convert lives entirely on Polkadot Hub's EVM-compatible layer (pallet-revive),
 * reached here through a Substrate-signed `Revive.call` extrinsic (see
 * polkadot-provider.tsx) rather than a separate EVM wallet connection — no ipow
 * contract is deployed to Polkadot Hub mainnet yet, so (mirroring Ethereum/Hedera's
 * own `_TESTNET`-only constants) this is intentionally a flat, testnet-only set of
 * values, not part of `NetworkConfigs`.
 */
export const IPOW_CONTRACT_ADDRESS_TESTNET = "0x2dD223DcD7F69539Ea895A29095c69c16b088aDb";
/** Read-only EVM JSON-RPC endpoint (pallet-revive's Ethereum-compatible adapter) — used
 * only for view calls; writes go through the Substrate `Revive.call` extrinsic instead. */
export const IPOW_EVM_RPC_URL_TESTNET = "https://eth-rpc-testnet.polkadot.io/";

/**
 * The decimal scale the ipow contract's on-chain amounts (nativeAmount, commitFee, etc.)
 * are actually stored in — NOT the same thing as DOT's own 10-decimal precision
 * (`decimals` above, correct for wallet balance/transfer display). pallet-revive scales
 * whatever native Planck value a `Revive.call` sends by `NativeToEthRatio` (10^8 on
 * Paseo Asset Hub) before the contract sees it as `msg.value`, so
 * the contract's own arithmetic — and therefore anything read back from it — is always
 * 18-decimal here, same as Ethereum's (where no such scaling happens at all) and unlike
 * Hedera's (whose Hashio relay scales the other direction, down to its native 8-decimal
 * tinybars). Used wherever a raw on-chain ipow amount needs formatting for display.
 */
export const IPOW_AMOUNT_DECIMALS = 18;
