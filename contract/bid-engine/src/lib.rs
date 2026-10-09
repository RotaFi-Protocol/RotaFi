#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN, Env, Map, Symbol,
    Vec,
};

const AUCTION: Symbol = symbol_short!("auction");
const COMMITS: Symbol = symbol_short!("commits");
const BIDS: Symbol = symbol_short!("bids");
const LAST_ROUND: Symbol = symbol_short!("last_rnd");

/// Basis-point denominator (100%).
pub const BPS_DENOMINATOR: u32 = 10_000;

/// Minimum length of the reveal window, in seconds.
///
/// The reveal window must be long enough that a member can observe the commit
/// phase close and still publish their opening before resolution. This is what
/// stops a last-ledger sniper from seeing the field and only then committing.
pub const MIN_REVEAL_WINDOW_SECONDS: u64 = 3_600;

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum BidState {
    Open,
    Closed,
}

/// Lifecycle of a single sealed-bid auction.
///
/// * `Commit` — members publish a hiding commitment to their discount.
/// * `Reveal` — the commit phase is closed; members publish openings.
/// * `Closed` — the auction has been resolved (or never started).
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum AuctionPhase {
    Commit,
    Reveal,
    Closed,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct Bid {
    pub member: Address,
    pub discount_bps: u32,
    pub round: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct AuctionConfig {
    pub circle_id: u32,
    /// The address allowed to open the auction. Prevents a third party from
    /// front-running `start_auction` with attacker-chosen parameters.
    pub organizer: Address,
    pub member_cap: u32,
    /// Reserve (minimum acceptable) discount in basis points.
    pub min_discount_bps: u32,
    /// Maximum acceptable discount in basis points.
    pub max_discount_bps: u32,
    /// Unix timestamp after which no further commitments are accepted.
    pub commit_deadline: u64,
    /// Unix timestamp after which the auction can be resolved without every
    /// commit having been revealed.
    pub reveal_deadline: u64,
}

/// Full mutable state for the auction currently in progress.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct Auction {
    pub config: AuctionConfig,
    /// The round this auction is bound to. Bids carrying any other round are
    /// rejected, so bids cannot straddle round boundaries.
    pub round: u32,
    /// The only addresses eligible to bid (the circle roster).
    pub members: Vec<Address>,
    pub phase: AuctionPhase,
    pub commit_count: u32,
    pub reveal_count: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct BidResult {
    pub winner: Address,
    pub winning_discount_bps: u32,
    pub discount_per_member: u32,
}

/// BidEngine handles sealed-bid auction logic for auction-style circles.
///
/// Members bid a discount (in basis points) to receive the pot early. The
/// winning discount is redistributed pro-rata to the other members as bonus
/// interest on their contributions.
///
/// Bids are **sealed** with a commit-reveal scheme: during the commit phase a
/// member publishes only `sha256(contract || member || round || discount || nonce)`.
/// The opening is revealed after the commit phase closes, so no bidder can read
/// the field and then outbid it in the same ledger.
#[contract]
pub struct BidEngine;

#[contractimpl]
impl BidEngine {
    /// Opens a new auction for a given circle, binding it to `round`, a
    /// `members` roster, and commit/reveal deadlines.
    ///
    /// # Arguments
    /// * `config` - Auction parameters. `config.organizer` must authorize.
    /// * `members` - The circle roster; only these addresses may bid.
    /// * `round` - The round this auction settles. Must be strictly greater
    ///   than the last resolved round so a past auction cannot be replayed.
    ///
    /// # Panics
    /// Panics if the organizer does not authorize, an auction is already open,
    /// the round is stale, the roster is malformed, or the config is invalid.
    pub fn start_auction(env: Env, config: AuctionConfig, members: Vec<Address>, round: u32) {
        config.organizer.require_auth();
        config.require_valid();

        assert!(
            members.len() == config.member_cap,
            "Member set must match member cap"
        );
        assert!(members.len() > 0, "Auction requires members");

        let existing: Option<Auction> = env.storage().instance().get(&AUCTION);
        if let Some(auction) = existing {
            assert!(
                effective_phase(&env, &auction) == AuctionPhase::Closed,
                "Auction already in progress"
            );
        }

        let last_round: u32 = env.storage().instance().get(&LAST_ROUND).unwrap_or(0);
        assert!(
            round > last_round,
            "Round must advance past the last resolved auction"
        );

        let now = env.ledger().timestamp();
        assert!(
            config.commit_deadline > now,
            "Commit deadline must be in the future"
        );

        let mut i = 0u32;
        while i < members.len() {
            let member = members.get(i).unwrap();
            let mut j = i + 1;
            while j < members.len() {
                assert!(
                    members.get(j).unwrap() != member,
                    "Duplicate member in auction roster"
                );
                j += 1;
            }
            i += 1;
        }

        let auction = Auction {
            config: config.clone(),
            round,
            members: members.clone(),
            phase: AuctionPhase::Commit,
            commit_count: 0,
            reveal_count: 0,
        };

        env.storage().instance().set(&AUCTION, &auction);
        env.storage().persistent().remove(&COMMITS);
        env.storage().persistent().remove(&BIDS);

        env.events().publish(
            (symbol_short!("auct_strt"),),
            (config.circle_id, round),
        );
    }

    /// Commits to a sealed bid for the current auction round.
    ///
    /// The commitment must be
    /// `sha256(contract || member || round || discount_bps_be || nonce)`.
    /// Commitments are binding: a member cannot change the discount after
    /// seeing anybody else's opening.
    ///
    /// # Panics
    /// Panics if the caller is not a roster member, the commit phase is closed,
    /// the round does not match, or the member has already committed.
    pub fn commit_bid(env: Env, member: Address, commitment: BytesN<32>, round: u32) {
        member.require_auth();

        let mut auction: Auction = load_auction(&env);
        assert!(
            effective_phase(&env, &auction) == AuctionPhase::Commit,
            "Commit phase is closed"
        );
        assert!(
            auction.round == round,
            "Bid round does not match the open auction"
        );
        assert!(is_member(&auction, &member), "Only circle members may bid");

        let mut commits: Map<Address, BytesN<32>> = env
            .storage()
            .persistent()
            .get(&COMMITS)
            .unwrap_or(Map::new(&env));
        assert!(
            !commits.contains_key(member.clone()),
            "Member already committed a bid"
        );

        commits.set(member.clone(), commitment.clone());
        auction.commit_count += 1;

        env.storage().persistent().set(&COMMITS, &commits);
        env.storage().instance().set(&AUCTION, &auction);

        env.events()
            .publish((symbol_short!("bid_cmt"),), (member, round));
    }

    /// Reveals a previously committed sealed bid.
    ///
    /// The contract recomputes the commitment digest and rejects any opening
    /// that does not match, so a member cannot adapt their bid to the field.
    ///
    /// # Panics
    /// Panics if the reveal phase is not open, the round does not match, the
    /// member never committed, the opening does not match the commitment, the
    /// discount is out of bounds, the reveal window has closed, or the member
    /// has already revealed.
    pub fn reveal_bid(
        env: Env,
        member: Address,
        discount_bps: u32,
        nonce: BytesN<32>,
        round: u32,
    ) {
        member.require_auth();

        let mut auction: Auction = load_auction(&env);
        assert!(
            effective_phase(&env, &auction) == AuctionPhase::Reveal,
            "Reveal phase is not open"
        );
        assert!(
            auction.round == round,
            "Bid round does not match the open auction"
        );
        assert!(is_member(&auction, &member), "Only circle members may bid");

        let now = env.ledger().timestamp();
        assert!(
            now <= auction.config.reveal_deadline,
            "Reveal deadline has passed"
        );

        assert!(
            discount_bps >= auction.config.min_discount_bps,
            "Discount below the auction reserve"
        );
        assert!(
            discount_bps <= auction.config.max_discount_bps,
            "Discount exceeds maximum allowed"
        );

        let commits: Map<Address, BytesN<32>> = env
            .storage()
            .persistent()
            .get(&COMMITS)
            .unwrap_or(Map::new(&env));
        let commitment = commits
            .get(member.clone())
            .unwrap_or_else(|| panic!("Member has not committed a bid"));

        let expected = bid_commitment_digest(&env, &member, round, discount_bps, &nonce);
        assert!(expected == commitment, "Reveal does not match commitment");

        let mut bids: Map<Address, Bid> = env
            .storage()
            .persistent()
            .get(&BIDS)
            .unwrap_or(Map::new(&env));
        assert!(
            !bids.contains_key(member.clone()),
            "Member already revealed a bid"
        );

        let bid = Bid {
            member: member.clone(),
            discount_bps,
            round,
        };
        bids.set(member.clone(), bid);
        auction.reveal_count += 1;

        env.storage().persistent().set(&BIDS, &bids);
        env.storage().instance().set(&AUCTION, &auction);

        env.events().publish(
            (symbol_short!("bid_rev"),),
            (member, discount_bps, round),
        );
    }

    /// Resolves the auction by selecting the highest revealed discount.
    ///
    /// Resolution is permissionless but time-boxed: it is only possible once
    /// every commit has been revealed or the reveal deadline has passed, so the
    /// caller cannot time the settle to a sniper.
    ///
    /// Ties are broken deterministically in favour of the lexicographically
    /// smallest address, so the winner does not depend on storage iteration
    /// order.
    ///
    /// # Panics
    /// Panics if the auction is not in the reveal phase, the reveal window is
    /// still open with reveals outstanding, or no valid bid was revealed.
    pub fn resolve_auction(env: Env) -> BidResult {
        let mut auction: Auction = load_auction(&env);
        assert!(
            effective_phase(&env, &auction) == AuctionPhase::Reveal,
            "Auction is not ready to resolve"
        );

        let now = env.ledger().timestamp();
        let all_revealed =
            auction.commit_count > 0 && auction.reveal_count >= auction.commit_count;
        let reveal_expired = now >= auction.config.reveal_deadline;
        assert!(
            all_revealed || reveal_expired,
            "Reveal window is still open"
        );

        let bids: Map<Address, Bid> = env
            .storage()
            .persistent()
            .get(&BIDS)
            .unwrap_or(Map::new(&env));
        assert!(bids.len() > 0, "No valid bids to resolve");

        let mut winner: Option<Address> = None;
        let mut highest: u32 = 0;
        for (_addr, bid) in bids.iter() {
            let better = match &winner {
                None => true,
                Some(current) => {
                    bid.discount_bps > highest
                        || (bid.discount_bps == highest && bid.member < *current)
                }
            };
            if better {
                highest = bid.discount_bps;
                winner = Some(bid.member.clone());
            }
        }

        let winner = winner.unwrap();

        let num_other_members = auction.config.member_cap.saturating_sub(1).max(1);
        let discount_per_member = highest / num_other_members;

        let result = BidResult {
            winner: winner.clone(),
            winning_discount_bps: highest,
            discount_per_member,
        };

        auction.phase = AuctionPhase::Closed;
        env.storage().instance().set(&AUCTION, &auction);
        env.storage().instance().set(&LAST_ROUND, &auction.round);
        env.storage().persistent().remove(&COMMITS);
        env.storage().persistent().remove(&BIDS);

        env.events().publish(
            (symbol_short!("auct_res"),),
            (winner, highest, discount_per_member),
        );

        result
    }

    /// Returns the coarse auction state (`Open` or `Closed`).
    pub fn get_state(env: Env) -> BidState {
        let auction: Option<Auction> = env.storage().instance().get(&AUCTION);
        match auction {
            Some(a) if effective_phase(&env, &a) != AuctionPhase::Closed => BidState::Open,
            _ => BidState::Closed,
        }
    }

    /// Returns the detailed auction phase.
    pub fn get_phase(env: Env) -> AuctionPhase {
        let auction: Option<Auction> = env.storage().instance().get(&AUCTION);
        match auction {
            Some(a) => effective_phase(&env, &a),
            None => AuctionPhase::Closed,
        }
    }

    /// Returns the full auction currently stored (open or just resolved).
    pub fn get_auction(env: Env) -> Option<Auction> {
        env.storage().instance().get(&AUCTION)
    }

    /// Returns the last round whose auction was resolved.
    pub fn get_last_resolved_round(env: Env) -> u32 {
        env.storage().instance().get(&LAST_ROUND).unwrap_or(0)
    }

    /// Returns the revealed bid for a specific member.
    ///
    /// Returns `None` while the bid is still sealed behind a commitment.
    pub fn get_bid(env: Env, member: Address) -> Option<Bid> {
        let bids: Map<Address, Bid> = env
            .storage()
            .persistent()
            .get(&BIDS)
            .unwrap_or(Map::new(&env));
        bids.get(member)
    }

    /// Returns a member's sealed commitment for the current auction.
    pub fn get_commitment(env: Env, member: Address) -> Option<BytesN<32>> {
        let commits: Map<Address, BytesN<32>> = env
            .storage()
            .persistent()
            .get(&COMMITS)
            .unwrap_or(Map::new(&env));
        commits.get(member)
    }

    /// Returns all revealed bids in the current auction.
    pub fn get_all_bids(env: Env) -> Vec<Bid> {
        let bids: Map<Address, Bid> = env
            .storage()
            .persistent()
            .get(&BIDS)
            .unwrap_or(Map::new(&env));
        let mut result: Vec<Bid> = Vec::new(&env);
        for (_addr, bid) in bids.iter() {
            result.push_back(bid);
        }
        result
    }
}

impl AuctionConfig {
    /// Validates that the auction parameters are internally consistent.
    fn require_valid(&self) {
        assert!(self.member_cap >= 2, "Auctions require at least 2 members");
        assert!(
            self.min_discount_bps <= self.max_discount_bps,
            "min_discount_bps exceeds max_discount_bps"
        );
        assert!(
            self.max_discount_bps <= BPS_DENOMINATOR,
            "max_discount_bps exceeds 100%"
        );
        assert!(
            self.reveal_deadline > self.commit_deadline,
            "reveal_deadline must follow commit_deadline"
        );
        assert!(
            self.reveal_deadline - self.commit_deadline >= MIN_REVEAL_WINDOW_SECONDS,
            "Reveal window too short"
        );
    }
}

/// Loads the current auction, panicking when none has been started.
fn load_auction(env: &Env) -> Auction {
    env.storage()
        .instance()
        .get(&AUCTION)
        .unwrap_or_else(|| panic!("No auction in progress"))
}

/// Resolves the phase taking the clock and commit progress into account.
///
/// The commit phase ends when every member has committed or when the commit
/// deadline elapses, whichever comes first. Deriving the phase instead of
/// storing every transition means a stalled commit phase cannot lock the
/// auction open forever.
fn effective_phase(env: &Env, auction: &Auction) -> AuctionPhase {
    match &auction.phase {
        AuctionPhase::Commit => {
            if auction.commit_count >= auction.config.member_cap
                || env.ledger().timestamp() > auction.config.commit_deadline
            {
                AuctionPhase::Reveal
            } else {
                AuctionPhase::Commit
            }
        }
        AuctionPhase::Reveal => AuctionPhase::Reveal,
        AuctionPhase::Closed => AuctionPhase::Closed,
    }
}

/// Returns true when `member` appears in the auction roster.
fn is_member(auction: &Auction, member: &Address) -> bool {
    for roster_member in auction.members.iter() {
        if roster_member == *member {
            return true;
        }
    }
    false
}

/// Computes the digest a member commits to for a sealed bid.
///
/// Layout: `sha256(contract_id || member || round_be || discount_bps_be || nonce)`.
///
/// Binding the contract, member and round prevents a commitment from being
/// replayed by another member, in another auction, or in another round.
pub fn bid_commitment_digest(
    env: &Env,
    member: &Address,
    round: u32,
    discount_bps: u32,
    nonce: &BytesN<32>,
) -> BytesN<32> {
    let mut data = Bytes::new(env);
    data.append(&env.current_contract_address().to_string().to_bytes());
    data.append(&member.to_string().to_bytes());
    data.extend_from_array(&round.to_be_bytes());
    data.extend_from_array(&discount_bps.to_be_bytes());
    data.extend_from_array(&nonce.to_array());
    env.crypto().sha256(&data).to_bytes()
}

#[cfg(test)]
mod test;
