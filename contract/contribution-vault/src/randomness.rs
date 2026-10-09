//! Verifiable on-chain randomness for lottery-style payout ordering.
//!
//! Stellar/Soroban does not expose a trustless randomness beacon that a
//! contract can safely consume on its own. `env.prng()` is seeded from public
//! ledger data and finalised by validators, so it must not be treated as a
//! source of fair entropy for high-value draws.
//!
//! Instead the vault implements a classic **commit-reveal** scheme:
//!
//! 1. Every eligible member commits `sha256(contract || member || round || secret)`.
//! 2. Once every eligible member has committed, the reveal phase opens and each
//!    member publishes their `secret`; the contract checks it matches the
//!    commitment.
//! 3. The draw seed is `sha256(openings... || ledger_sequence || timestamp || network_id)`.
//!
//! Because every commitment is fixed before any secret is revealed, a member
//! cannot adapt their contribution to the other openings. The ledger fields in
//! the seed further ensure the result cannot be predicted before the draw
//! ledger closes. Anyone can recompute the seed and the resulting winner from
//! the public events, making the draw fully verifiable.

use soroban_sdk::{contracttype, symbol_short, Address, Bytes, BytesN, Env, Symbol, Vec};

/// Storage key for the current round's [`RoundRandomness`].
pub const RANDOMNESS: Symbol = symbol_short!("rnd");
/// Storage key for the map of per-member commitments: `Map<(round, Address), BytesN<32>>`.
pub const COMMITMENTS: Symbol = symbol_short!("commits");
/// Storage key for the map of per-member reveals: `Map<(round, Address), BytesN<32>>`.
pub const REVEALS: Symbol = symbol_short!("reveals");
/// Storage key for the map of finalised draw seeds: `Map<u32, BytesN<32>>`.
pub const ROUND_SEEDS: Symbol = symbol_short!("seeds");

/// Seconds members have to reveal after the commit phase closes.
///
/// After this window the draw may proceed with a partial set of reveals so
/// funds can never be permanently locked by a non-revealing member.
pub const REVEAL_WINDOW_SECONDS: u64 = 86_400;

/// Lifecycle of the lottery for a single round.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum LotteryPhase {
    /// Members are submitting commitments.
    Committing,
    /// All commitments in; members are revealing their secrets.
    Revealing,
    /// Every eligible member revealed; the draw is ready.
    Ready,
    /// The round's winner has been drawn and paid.
    Drawn,
}

/// Commit-reveal state for a single round.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct RoundRandomness {
    pub round: u32,
    pub phase: LotteryPhase,
    pub eligible_count: u32,
    pub commit_count: u32,
    pub reveal_count: u32,
    /// Unix timestamp after which a partial-reveal draw is permitted.
    pub reveal_deadline: u64,
}

impl RoundRandomness {
    pub fn new(round: u32, eligible_count: u32) -> Self {
        Self {
            round,
            phase: LotteryPhase::Committing,
            eligible_count,
            commit_count: 0,
            reveal_count: 0,
            reveal_deadline: 0,
        }
    }
}

/// Computes the digest a member commits to.
///
/// Layout: `sha256(contract_id || member || round_be || secret)`.
///
/// Binding the contract, member and round prevents a commitment from being
/// replayed in another vault, by another member, or in another round.
pub fn commitment_digest(
    env: &Env,
    member: &Address,
    round: u32,
    secret: &BytesN<32>,
) -> BytesN<32> {
    let mut data = Bytes::new(env);
    data.append(&env.current_contract_address().to_string().to_bytes());
    data.append(&member.to_string().to_bytes());
    data.extend_from_array(&round.to_be_bytes());
    data.extend_from_array(&secret.to_array());
    env.crypto().sha256(&data).to_bytes()
}

/// Derives the final draw seed from the round's openings and ledger data.
///
/// The ledger sequence, close timestamp and network id are mixed in so the
/// seed cannot be known until the draw transaction's ledger closes, even if
/// every opening is public.
pub fn derive_seed(env: &Env, openings: &Vec<BytesN<32>>) -> BytesN<32> {
    let mut data = Bytes::new(env);
    for opening in openings.iter() {
        data.extend_from_array(&opening.to_array());
    }
    data.extend_from_array(&env.ledger().sequence().to_be_bytes());
    data.extend_from_array(&env.ledger().timestamp().to_be_bytes());
    data.extend_from_array(&env.ledger().network_id().to_array());
    env.crypto().sha256(&data).to_bytes()
}

/// Maps a 32-byte seed into the index range `0..len` using its leading bytes.
pub fn seed_to_index(seed: &BytesN<32>, len: u32) -> u32 {
    if len == 0 {
        return 0;
    }
    let bytes = seed.to_array();
    let mut acc: u64 = 0;
    let mut i = 0usize;
    while i < 8 {
        acc = (acc << 8) | (bytes[i] as u64);
        i += 1;
    }
    (acc % (len as u64)) as u32
}

/// Returns a copy of `addresses` sorted ascending.
///
/// Sorting is required so the seed derivation is deterministic and independent
/// of storage iteration order, which would otherwise let a caller bias the
/// result simply by choosing when to call the draw.
pub fn sorted_addresses(env: &Env, addresses: &Vec<Address>) -> Vec<Address> {
    let mut out: Vec<Address> = Vec::new(env);
    for addr in addresses.iter() {
        let mut pos = out.len();
        let mut i = 0u32;
        while i < out.len() {
            if addr < out.get(i).unwrap() {
                pos = i;
                break;
            }
            i += 1;
        }
        out.insert(pos, addr);
    }
    out
}
