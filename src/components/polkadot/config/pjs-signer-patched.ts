/**
 * A patched version of `@polkadot-api/pjs-signer`'s `getPolkadotSignerFromPjs`, extended
 * with support for signed extensions that library doesn't know how to translate for a
 * legacy browser-extension signer.
 *
 * Paseo Asset Hub (testnet) carries several extensions beyond Polkadot mainnet's set, all
 * from custom `indiv_pallet_*` pallets being trialled there ahead of any mainnet rollout.
 * Verified directly against both chains' live metadata (decoded via
 * `unifyMetadata(decAnyMetadata(...))`, the same way this file's `signTx` does) before
 * writing anything here, rather than guessing per extension as each one surfaced:
 *
 * - `AuthorizeValueTransfer` (`indiv_pallet_value_transfer_auth`), `AsPgas`
 *   (`indiv_pallet_pgas`), `AsRingAlias` (`indiv_pallet_alias_accounts`), and
 *   `AsDotnsGateway` (`indiv_pallet_dotns_gateway`) all wrap `Option<SomeInfo<T>>` — optional
 *   feature-gates. An ordinary transaction that doesn't opt into any of these features
 *   encodes `None` for all four (one byte, `0x00`).
 * - `RestrictOrigins` (`indiv_pallet_origin_restriction`) wraps a plain `bool`, defaulting to
 *   `false` (not restricted) for an ordinary transaction.
 * - `AuthorizeCall` (`frame_system::extensions::authorize_call`), `CheckNonZeroSender`,
 *   `CheckWeight`, `PrevalidateAttests`, `EthSetOrigin`, and `StorageWeightReclaim` are all
 *   genuinely zero-byte (empty composite/tuple types) on *both* chains — these were already
 *   safely skipped by pjs-signer's own "skip if empty" check and never needed a mapper.
 *
 * pjs-signer only skips *zero-byte* unmapped extensions; anything else throws "PJS does not
 * support this signed-extension" rather than proceeding. But the real signed bytes are
 * already included in the transaction regardless of whether a mapper exists
 * (`extra.push(signedExtension.value)` happens unconditionally, below) — a mapper only
 * controls what gets surfaced to the wallet's confirmation UI. Since the correct value for
 * all five extensions above is "this optional feature is unused," there's nothing meaningful
 * to surface, so a no-op mapper doesn't change what gets signed — it just stops the refusal.
 *
 * Everything else here (the 8 built-in mappers + the overall signTx flow) is a straight,
 * behavior-preserving copy of pjs-signer's own internals — its mapper submodule isn't part
 * of its public package exports (only `.` is), so it can't be imported directly, and ES
 * module namespace objects are read-only so it can't be monkeypatched either.
 */
import { createV4Tx } from "@polkadot-api/signers-common";
import {
  AccountId,
  Blake2256,
  unifyMetadata,
  decAnyMetadata,
  compact,
  compactBn,
  u32,
  Struct,
  Option,
  Bytes,
} from "@polkadot-api/substrate-bindings";
import { fromHex, toHex } from "@polkadot-api/utils";
import type { PolkadotSigner } from "@polkadot-api/polkadot-signer";

const toPjsHex = (value: bigint | number, minByteLen: number) => {
  let inner = value.toString(16);
  inner = (inner.length % 2 ? "0" : "") + inner;
  const nPaddedBytes = Math.max(0, minByteLen - inner.length / 2);
  return "0x" + "00".repeat(nPaddedBytes) + inner;
};

type ExtensionValue = { value: Uint8Array; additionalSigned: Uint8Array };

const assetTxPaymentDec = Struct({ tip: compact, asset: Option(Bytes(Infinity)) }).dec;

/** Same shape/behavior as pjs-signer's own bundled mappers — kept local since that submodule isn't publicly exported. */
const pjsSignedExtensionsMappers: Record<string, (ext: ExtensionValue, atBlockNumber: number) => Record<string, unknown>> = {
  CheckGenesis: ({ additionalSigned }) => ({ genesisHash: toHex(additionalSigned) }),
  CheckNonce: ({ value }) => ({ nonce: toPjsHex(compact.dec(value), 4) }),
  CheckTxVersion: ({ additionalSigned }) => ({ transactionVersion: toPjsHex(u32.dec(additionalSigned), 4) }),
  ChargeAssetTxPayment: ({ value }) => {
    const { tip, asset } = assetTxPaymentDec(value);
    return { ...(asset ? { assetId: toHex(asset) } : {}), tip: toPjsHex(tip, 16) };
  },
  ChargeTransactionPayment: ({ value }) => ({ tip: toPjsHex(compactBn.dec(value), 16) }),
  CheckMortality: ({ value, additionalSigned }, blockNumber) => ({
    era: toHex(value),
    blockHash: toHex(additionalSigned),
    blockNumber: toPjsHex(blockNumber, 4),
  }),
  CheckSpecVersion: ({ additionalSigned }) => ({ specVersion: toPjsHex(u32.dec(additionalSigned), 4) }),
  CheckMetadataHash: ({ value, additionalSigned }) =>
    value.length && value[0]
      ? { mode: 1, metadataHash: toHex(additionalSigned.length ? additionalSigned.slice(1) : additionalSigned) }
      : {},
  // --- Our additions: see file header. Each is an optional/experimental feature-gate that
  // an ordinary transaction leaves unused, so there's nothing to surface to the wallet UI. ---
  AuthorizeValueTransfer: () => ({}),
  AsPgas: () => ({}),
  AsRingAlias: () => ({}),
  AsDotnsGateway: () => ({}),
  RestrictOrigins: () => ({}),
};

const accountIdEnc = AccountId().enc;
const getPublicKey = (address: string) => (address.startsWith("0x") ? fromHex(address) : accountIdEnc(address));

type SignPayload = (payload: any) => Promise<{ signature: string; signedTransaction?: string | Uint8Array }>;
type SignRaw = (payload: { address: string; data: string; type: "bytes" }) => Promise<{ id: number; signature: string }>;

export function getPatchedPolkadotSignerFromPjs(address: string, signPayload: SignPayload, signRaw: SignRaw): PolkadotSigner {
  const signBytes = (data: Uint8Array) =>
    signRaw({ address, data: toHex(data), type: "bytes" }).then(({ signature }) => fromHex(signature));
  const publicKey = getPublicKey(address);

  const signTx = async (
    callData: Uint8Array,
    signedExtensions: Record<string, ExtensionValue>,
    metadata: Uint8Array,
    atBlockNumber: number,
    _hasher = Blake2256,
  ) => {
    const decMeta = unifyMetadata(decAnyMetadata(metadata));
    const pjs: Record<string, unknown> = { signedExtensions: [] as string[] };
    const { version } = decMeta.extrinsic;
    const extra: Uint8Array[] = [];

    decMeta.extrinsic.signedExtensions[0].forEach(({ identifier }: { identifier: string }) => {
      const signedExtension = signedExtensions[identifier];
      if (!signedExtension) throw new Error(`Missing ${identifier} signed-extension`);
      extra.push(signedExtension.value);
      (pjs.signedExtensions as string[]).push(identifier);

      if (!pjsSignedExtensionsMappers[identifier]) {
        if (signedExtension.value.length === 0 && signedExtension.additionalSigned.length === 0) return;
        throw new Error(`PJS does not support this signed-extension: ${identifier}`);
      }
      Object.assign(pjs, pjsSignedExtensionsMappers[identifier](signedExtension, atBlockNumber));
    });

    const checkedVersion = version.includes(4) ? 4 : null;
    if (checkedVersion == null) throw new Error("Only extrinsic v4 is supported");

    pjs.address = address;
    pjs.method = toHex(callData);
    pjs.version = checkedVersion;
    pjs.withSignedTransaction = true;

    console.error("[Polkadot signTx] publicKey:", toHex(publicKey), "pjs payload:", pjs);
    const result = await signPayload(pjs);
    console.error("[Polkadot signTx] result:", result);
    const tx = result.signedTransaction;
    if (tx) {
      console.error("[Polkadot signTx] using extension-provided signedTransaction");
      return typeof tx === "string" ? fromHex(tx) : tx;
    }
    console.error("[Polkadot signTx] building tx locally from signature; extra:", extra.map(toHex));
    return createV4Tx(decMeta, publicKey, fromHex(result.signature), extra, callData);
  };

  return { publicKey, signTx, signBytes } as PolkadotSigner;
}
