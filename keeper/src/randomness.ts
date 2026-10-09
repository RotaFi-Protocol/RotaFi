import { createHash } from 'crypto';

/**
 * Client-side helpers that mirror the on-chain commit-reveal lottery in the
 * `contribution-vault` Soroban contract.
 *
 * Keeping these pure and dependency-free lets the keeper (or any tooling)
 * independently reproduce the commitment digest, draw seed and winner index
 * that the contract computes, so a draw can be verified without trusting the
 * transaction submitter.
 */

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export interface LedgerEntropy {
  sequence: number;
  /** Unix close time of the draw ledger, in seconds. */
  timestamp: number;
  /** 32-byte network id as hex (64 chars), e.g. SHA-256 of the passphrase. */
  networkId: string;
}

export interface LotteryDrawInput {
  /** Addresses eligible for the pot, order is irrelevant. */
  eligible: string[];
  /**
   * 32-byte openings (reveals, else commitments) as hex. Must be aligned to
   * `sortAddresses(eligible)` — the same deterministic order the contract
   * derives before hashing.
   */
  openings: string[];
  /** Ledger state that cannot be predicted before the draw ledger closes. */
  ledger: LedgerEntropy;
}

/** RFC 4648 base32 decode (no padding), as used by Stellar strkeys. */
function base32Decode(value: string): Uint8Array {
  let bits = 0;
  let acc = 0;
  const out: number[] = [];
  for (const char of value) {
    const index = B32_ALPHABET.indexOf(char);
    acc = (acc << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/**
 * Returns the raw 32-byte key from a Stellar strkey ("G..." account or "C..."
 * contract) so addresses sort exactly like the contract's `Address::cmp`.
 */
function addressKeyBytes(address: string): Buffer {
  const decoded = base32Decode(address);
  // [version(1)] [key(32)] [crc16(2)]
  return Buffer.from(decoded.slice(1, decoded.length - 2));
}

/** Sorts Stellar addresses using their raw key bytes, like `Address::cmp`. */
export function sortAddresses(addresses: string[]): string[] {
  return [...addresses].sort((a, b) => {
    const aTag = a.startsWith('G') ? 0 : 1;
    const bTag = b.startsWith('G') ? 0 : 1;
    if (aTag !== bTag) return aTag - bTag;
    return addressKeyBytes(a).compare(addressKeyBytes(b));
  });
}

/**
 * Computes the commitment digest a member submits on-chain.
 *
 * Layout (must stay in sync with `randomness.rs::commitment_digest`):
 * `sha256(contract_id || member || round_be || secret)`.
 */
export function commitmentDigest(params: {
  contractId: string;
  member: string;
  round: number;
  secret: string;
}): string {
  const { contractId, member, round, secret } = params;
  const roundBuf = Buffer.alloc(4);
  roundBuf.writeUInt32BE(round >>> 0);
  const preimage = Buffer.concat([
    Buffer.from(contractId, 'utf8'),
    Buffer.from(member, 'utf8'),
    roundBuf,
    Buffer.from(secret, 'hex'),
  ]);
  return createHash('sha256').update(preimage).digest('hex');
}

/**
 * Derives the final draw seed from the round's openings and ledger data.
 *
 * Layout (must stay in sync with `randomness.rs::derive_seed`):
 * `sha256(openings... || sequence_be || timestamp_be || network_id)`.
 */
export function deriveSeed(openings: string[], ledger: LedgerEntropy): string {
  const sequenceBuf = Buffer.alloc(4);
  sequenceBuf.writeUInt32BE(ledger.sequence >>> 0);
  const timestampBuf = Buffer.alloc(8);
  timestampBuf.writeBigUInt64BE(BigInt(ledger.timestamp));
  const preimage = Buffer.concat([
    ...openings.map((opening) => Buffer.from(opening, 'hex')),
    sequenceBuf,
    timestampBuf,
    Buffer.from(ledger.networkId, 'hex'),
  ]);
  return createHash('sha256').update(preimage).digest('hex');
}

/** Maps a 32-byte hex seed into `0..len` using its leading 8 bytes. */
export function seedToIndex(seed: string, len: number): number {
  if (len <= 0) return 0;
  if (len > Number.MAX_SAFE_INTEGER) {
    throw new Error('len exceeds MAX_SAFE_INTEGER');
  }
  const head = BigInt(`0x${seed.slice(0, 16)}`);
  return Number(head % BigInt(len));
}

/**
 * Deterministically selects the lottery winner for a draw.
 *
 * Returns the address, or `null` when no member is eligible.
 */
export function determineWinner(draw: LotteryDrawInput): string | null {
  const { eligible, openings, ledger } = draw;
  if (eligible.length === 0) return null;
  const sorted = sortAddresses(eligible);
  const seed = deriveSeed(openings, ledger);
  return sorted[seedToIndex(seed, sorted.length)];
}