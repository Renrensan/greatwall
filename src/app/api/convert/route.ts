
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs'; 

const ESPLORA_BASE =
  process.env.ESPLORA_BASE || 'https://mempool.space/api';


const from0x = (h: string) => (h.startsWith('0x') ? h.slice(2) : h);
const to0x = (h: string) => (h.startsWith('0x') ? h : '0x' + h);


function dsha256(buf: Buffer): Buffer {
  return crypto
    .createHash('sha256')
    .update(crypto.createHash('sha256').update(buf).digest())
    .digest();
}

function hexLEfromBE32(hex: string): string {
  const s = from0x(hex);
  if (s.length !== 64) throw new Error('need 32B hex');
  return '0x' + s.match(/.{2}/g)!.reverse().join('');
}

/** Returns both display (BE) and LE bytes hashes from header80 (0x-hex, 80 bytes) */
function headerHashBothFromHeader80(header80_0x: string) {
  const raw = Buffer.from(from0x(header80_0x), 'hex');
  if (raw.length !== 80) throw new Error('header not 80 bytes');
  const h = dsha256(raw);
  const beHex = '0x' + Buffer.from(h).reverse().toString('hex');
  const leHex = '0x' + Buffer.from(h).toString('hex');
  return { beHex, leHex };
}

/** ====== Compact bits → target (same logic as test script) ====== */
function powLimit(): bigint {
  // 0xFFFF << (8 * (0x1d - 3))
  return BigInt(0xffff) << BigInt(8 * (0x1d - 3));
}

function targetFromBits(bits: number): bigint {
  const exp = (bits >>> 24) & 0xff;
  const mant = bits & 0x007fffff;

  let target = BigInt(0);
  if (exp <= 3) {
    target = BigInt(mant) >> BigInt(8 * (3 - exp));
  } else {
    target = BigInt(mant) << BigInt(8 * (exp - 3));
  }

  const limit = powLimit();
  if (target > limit) target = limit;
  return target;
}

/** parse nBits from header80 (bytes 72..75), LE 4 bytes → uint32 */
function readCompactBitsFromHeader80(header80_0x: string): number {
  const s = from0x(header80_0x);
  const b72 = parseInt(s.slice(144, 146), 16);
  const b73 = parseInt(s.slice(146, 148), 16);
  const b74 = parseInt(s.slice(148, 150), 16);
  const b75 = parseInt(s.slice(150, 152), 16);
  return (b72 | (b73 << 8) | (b74 << 16) | (b75 << 24)) >>> 0;
}

/** Check PoW like in test script (LE header hash ≤ target) */
function checkWorkLE(header80_0x: string) {
  const { leHex } = headerHashBothFromHeader80(header80_0x);
  const bits = readCompactBitsFromHeader80(header80_0x);
  const target = targetFromBits(bits);

  const bytes = Buffer.from(from0x(leHex), 'hex');
  let hVal = BigInt(0);
  for (let i = 0; i < 32; i++) {
    hVal |= BigInt(bytes[i]) << BigInt(8 * i);
  }

  return { ok: hVal <= target, bits, target, hVal };
}

/** ========= VarInt helpers ========= */
function readVarInt(buf: Buffer, o: number): { v: bigint; next: number } {
  const p = buf[o];
  if (p < 0xfd) return { v: BigInt(p), next: o + 1 };
  if (p === 0xfd)
    return { v: BigInt(buf.readUInt16LE(o + 1)), next: o + 3 };
  if (p === 0xfe)
    return { v: BigInt(buf.readUInt32LE(o + 1)), next: o + 5 };
  const lo = buf.readUInt32LE(o + 1);
  const hi = buf.readUInt32LE(o + 5);
  return {
    v: (BigInt(hi) << BigInt(32)) | BigInt(lo),
    next: o + 9
  };
}

function writeVarInt(n: bigint): Buffer {
  if (n < BigInt(0xfd)) {
    return Buffer.from([Number(n)]);
  }
  if (n <= BigInt(0xffff)) {
    const b = Buffer.alloc(3);
    b[0] = 0xfd;
    b.writeUInt16LE(Number(n), 1);
    return b;
  }
  if (n <= BigInt(0xffffffff)) {
    const b = Buffer.alloc(5);
    b[0] = 0xfe;
    b.writeUInt32LE(Number(n), 1);
    return b;
  }
  const b = Buffer.alloc(9);
  b[0] = 0xff;
  const lo = Number(n & BigInt(0xffffffff));
  const hi = Number((n >> BigInt(32)) & BigInt(0xffffffff));
  b.writeUInt32LE(lo, 1);
  b.writeUInt32LE(hi, 5);
  return b;
}

/** turn raw tx (possibly segwit) into legacy serialization (no witness) */
function toLegacySerializationStrict(txHex0x: string): Buffer {
  const buf = Buffer.from(from0x(txHex0x), 'hex');
  let o = 0;
  if (buf.length < 4) throw new Error('tx too short');

  // version
  const version = buf.slice(0, 4);
  o += 4;

  // segwit marker/flag?
  if (buf[o] === 0x00 && buf[o + 1] === 0x01) {
    o += 2;
  }

  // vin
  const vinVar = readVarInt(buf, o);
  const inCount = vinVar.v;
  o = vinVar.next;
  const vinChunks: Buffer[] = [];
  for (let i = BigInt(0); i < inCount; i++) {
    const start = o;
    o += 32 + 4; // prev txid + vout index
    const scr = readVarInt(buf, o);
    const slen = Number(scr.v);
    o = scr.next;
    o += slen; // scriptSig
    o += 4; // sequence
    vinChunks.push(buf.slice(start, o));
  }

  // vout
  const voutVar = readVarInt(buf, o);
  const outCount = voutVar.v;
  o = voutVar.next;
  const voutChunks: Buffer[] = [];
  for (let j = BigInt(0); j < outCount; j++) {
    const start = o;
    o += 8; // value
    const spk = readVarInt(buf, o);
    const plen = Number(spk.v);
    o = spk.next;
    o += plen; // scriptPubKey
    voutChunks.push(buf.slice(start, o));
  }

  // locktime (last 4 bytes)
  const locktime = buf.slice(-4);

  const vinCountEnc = writeVarInt(inCount);
  const voutCountEnc = writeVarInt(outCount);
  return Buffer.concat([
    version,
    vinCountEnc,
    ...vinChunks,
    voutCountEnc,
    ...voutChunks,
    locktime
  ]);
}

/** compute txid & wtxid (BE hex, no 0x) */
function computeTxids(txHex0x: string) {
  const full = Buffer.from(from0x(txHex0x), 'hex');
  const legacy = toLegacySerializationStrict(txHex0x);
  const txidBE = Buffer.from(dsha256(legacy)).reverse().toString('hex');
  const wtxidBE = Buffer.from(dsha256(full)).reverse().toString('hex');
  return { legacyBuf: legacy, txidBE, wtxidBE };
}

/** merkle root folding (LE-domain) */
function dsha256_concat(aLE: Buffer, bLE: Buffer): Buffer {
  return dsha256(Buffer.concat([aLE, bLE]));
}

function computeRootFromProofLE(
  leafLE_hex: string,
  branchLE_hexes: string[],
  index: number
): string {
  let h = Buffer.from(from0x(leafLE_hex), 'hex');
  let idx = BigInt(index);
  for (const sibHex of branchLE_hexes) {
    const sib = Buffer.from(from0x(sibHex), 'hex');
    if ((idx & BigInt(1)) === BigInt(1)) {
      h = dsha256_concat(sib, h) as Buffer<ArrayBuffer>;
    } else {
      h = dsha256_concat(h, sib) as Buffer<ArrayBuffer>;
    }
    idx = idx >> BigInt(1);
  }
  return '0x' + Buffer.from(h).toString('hex');
}

/** get merkle root LE from header80 (0x-prefixed hex) */
function merkleRootLE_fromHeader80(header80_0x: string): string {
  // bytes 36..68 (hashMerkleRoot) in little-endian
  return '0x' + from0x(header80_0x).slice(72, 136);
}

// ========== Esplora helpers ==========

async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.text()).trim();
}

async function getJson<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

async function txHex(txidBE: string): Promise<string> {
  const hex = await getText(`${ESPLORA_BASE}/tx/${txidBE}/hex`);
  return to0x(hex);
}

async function txMerkleProof(txidBE: string): Promise<any> {
  return await getJson(`${ESPLORA_BASE}/tx/${txidBE}/merkle-proof`);
}

async function header80ByHeight(height: number): Promise<{
  blockHashBE: string;
  header80: string;
}> {
  const hashBE = await getText(`${ESPLORA_BASE}/block-height/${height}`);
  const headerHex = await getText(`${ESPLORA_BASE}/block/${hashBE}/header`);
  return { blockHashBE: hashBE, header80: to0x(headerHex) };
}

// ========== core: build proof bundle ==========
async function buildProofBundleFromEsplora(opts: {
  txidBE: string;
  voutIndex: number;
  blockHeight: number;
  blockHashBE?: string;
}) {
  const { txidBE, voutIndex, blockHeight, blockHashBE } = opts;

  // 1) Merkle proof from Esplora
  const proof = await txMerkleProof(txidBE);

  // 2) Block header at that height
  const { header80, blockHashBE: fromHeightHashBE } =
    await header80ByHeight(blockHeight);

  const usedBlockHashBE = blockHashBE ?? fromHeightHashBE;
  const headerRootLE = merkleRootLE_fromHeader80(header80);

  // (optional) PoW check
  const pow = checkWorkLE(header80);
  if (!pow.ok) {
    throw new Error(
      `Header at height ${blockHeight} has low work (bits=0x${pow.bits.toString(
        16
      )})`
    );
  }

  // 3) Full tx hex & txids
  const txRawOriginal = await txHex(txidBE);
  const { legacyBuf, txidBE: calcBE, wtxidBE } = computeTxids(txRawOriginal);

  if (calcBE.toLowerCase() !== txidBE.toLowerCase()) {
    throw new Error(
      `txid mismatch: expected ${txidBE}, computed ${calcBE}, wtxid=${wtxidBE}`
    );
  }

  const txidLE = hexLEfromBE32(calcBE);

  // 4) Fold merkle branch in LE domain, choose orientation that matches header
  const branchLE_fromAPI: string[] = (proof.merkle || []).map((h: string) =>
    hexLEfromBE32(h)
  );

  const root_asIs = computeRootFromProofLE(
    txidLE,
    branchLE_fromAPI,
    proof.pos
  );
  const root_rev = computeRootFromProofLE(
    txidLE,
    [...branchLE_fromAPI].reverse(),
    proof.pos
  );

  let branchToUse = branchLE_fromAPI;
  if (root_asIs.toLowerCase() !== headerRootLE.toLowerCase()) {
    if (root_rev.toLowerCase() === headerRootLE.toLowerCase()) {
      branchToUse = [...branchLE_fromAPI].reverse();
    } else {
      throw new Error(
        `Merkle branch does not match header root. headerRootLE=${headerRootLE}, root_asIs=${root_asIs}, root_rev=${root_rev}`
      );
    }
  }

  const blockHashLE = hexLEfromBE32(usedBlockHashBE);

  return {
    legacy0x: '0x' + legacyBuf.toString('hex'),
    voutIndex,
    blockHashLE,
    blockHeight,
    branch: branchToUse,
    index: proof.pos
  };
}

// ========== Route handlers ==========

// simple ping so you can hit /api/convert in the browser
export function GET() {
  return NextResponse.json({ ok: true, route: '/api/convert' });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { txidBE, voutIndex, blockHeight, blockHashBE } = body || {};

    if (!txidBE || typeof txidBE !== 'string') {
      return NextResponse.json(
        { error: 'txidBE is required' },
        { status: 400 }
      );
    }
    if (!/^[0-9a-fA-F]{64}$/.test(txidBE)) {
      return NextResponse.json(
        { error: 'txidBE must be 64 hex characters (big-endian)' },
        { status: 400 }
      );
    }

    const vout = Number(voutIndex);
    if (!Number.isFinite(vout) || vout < 0) {
      return NextResponse.json(
        { error: 'voutIndex must be a non-negative integer' },
        { status: 400 }
      );
    }

    const bh = Number(blockHeight);
    if (!Number.isFinite(bh) || bh <= 0) {
      return NextResponse.json(
        { error: 'blockHeight must be a positive integer' },
        { status: 400 }
      );
    }

    const bundle = await buildProofBundleFromEsplora({
      txidBE: txidBE.toLowerCase(),
      voutIndex: vout,
      blockHeight: bh,
      blockHashBE:
        typeof blockHashBE === 'string' && blockHashBE.length === 64
          ? blockHashBE.toLowerCase()
          : undefined
    });

    return NextResponse.json(bundle, { status: 200 });
  } catch (e: any) {
    console.error('[convert] error:', e);
    const msg =
      typeof e === 'string'
        ? e
        : e?.message || 'Failed to build BTC proof bundle';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
