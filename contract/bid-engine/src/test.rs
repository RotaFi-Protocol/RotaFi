#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{Address, BytesN, Env};

const COMMIT_DEADLINE: u64 = 1_000;
const REVEAL_DEADLINE: u64 = 5_000;

fn deploy(env: &Env) -> Address {
    env.register(BidEngine, ())
}

fn roster(env: &Env) -> [Address; 3] {
    [
        Address::generate(env),
        Address::generate(env),
        Address::generate(env),
    ]
}

fn config(_env: &Env, organizer: &Address) -> AuctionConfig {
    AuctionConfig {
        circle_id: 1,
        organizer: organizer.clone(),
        member_cap: 3,
        min_discount_bps: 100,
        max_discount_bps: 3_000,
        commit_deadline: COMMIT_DEADLINE,
        reveal_deadline: REVEAL_DEADLINE,
    }
}

fn vec_of(env: &Env, members: &[Address]) -> Vec<Address> {
    let mut roster: Vec<Address> = Vec::new(env);
    for member in members.iter() {
        roster.push_back(member.clone());
    }
    roster
}

fn start(env: &Env, contract: &Address, organizer: &Address, members: &[Address; 3]) {
    let cfg = config(env, organizer);
    let roster = vec_of(env, members);
    env.mock_all_auths();
    BidEngineClient::new(env, contract).start_auction(&cfg, &roster, &1u32);
}

fn nonce(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

fn digest(
    env: &Env,
    contract: &Address,
    member: &Address,
    round: u32,
    discount_bps: u32,
    nonce_seed: u8,
) -> BytesN<32> {
    let n = nonce(env, nonce_seed);
    env.as_contract(contract, || {
        bid_commitment_digest(env, member, round, discount_bps, &n)
    })
}

fn commit(
    env: &Env,
    contract: &Address,
    member: &Address,
    discount_bps: u32,
    nonce_seed: u8,
    round: u32,
) {
    let commitment = digest(env, contract, member, round, discount_bps, nonce_seed);
    env.mock_all_auths();
    BidEngineClient::new(env, contract).commit_bid(member, &commitment, &round);
}

fn reveal(
    env: &Env,
    contract: &Address,
    member: &Address,
    discount_bps: u32,
    nonce_seed: u8,
    round: u32,
) {
    let n = nonce(env, nonce_seed);
    env.mock_all_auths();
    BidEngineClient::new(env, contract).reveal_bid(member, &discount_bps, &n, &round);
}

fn commit_all(env: &Env, contract: &Address, members: &[Address; 3], discounts: (u32, u32, u32)) {
    commit(env, contract, &members[0], discounts.0, 1, 1);
    commit(env, contract, &members[1], discounts.1, 2, 1);
    commit(env, contract, &members[2], discounts.2, 3, 1);
}

fn reveal_all(env: &Env, contract: &Address, members: &[Address; 3], discounts: (u32, u32, u32)) {
    reveal(env, contract, &members[0], discounts.0, 1, 1);
    reveal(env, contract, &members[1], discounts.1, 2, 1);
    reveal(env, contract, &members[2], discounts.2, 3, 1);
}

#[test]
fn test_start_auction() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);

    let client = BidEngineClient::new(&env, &contract);
    assert_eq!(client.get_state(), BidState::Open);
    assert_eq!(client.get_phase(), AuctionPhase::Commit);
    assert_eq!(client.get_last_resolved_round(), 0);
    assert_eq!(client.get_auction().unwrap().round, 1);
}

#[test]
#[should_panic(expected = "Auction already in progress")]
fn test_double_start() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    start(&env, &contract, &organizer, &members);
}

#[test]
#[should_panic(expected = "Round must advance past the last resolved auction")]
fn test_stale_round_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));
    reveal_all(&env, &contract, &members, (500, 800, 300));
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract).resolve_auction();

    start(&env, &contract, &organizer, &members);
}

#[test]
fn test_next_round_accepted() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));
    reveal_all(&env, &contract, &members, (500, 800, 300));
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract).resolve_auction();

    let cfg = config(&env, &organizer);
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract).start_auction(&cfg, &vec_of(&env, &members), &2u32);
    assert_eq!(
        BidEngineClient::new(&env, &contract).get_auction().unwrap().round,
        2
    );
}

#[test]
#[should_panic(expected = "Member set must match member cap")]
fn test_member_cap_mismatch_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    let cfg = config(&env, &organizer);
    let short = vec_of(&env, &members[..2]);
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract).start_auction(&cfg, &short, &1u32);
}

#[test]
#[should_panic(expected = "Duplicate member in auction roster")]
fn test_duplicate_roster_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let m0 = Address::generate(&env);
    let m1 = Address::generate(&env);
    let duplicate = [m0.clone(), m0, m1];

    start(&env, &contract, &organizer, &duplicate);
}

#[test]
#[should_panic(expected = "Reveal window too short")]
fn test_short_reveal_window_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    let mut cfg = config(&env, &organizer);
    cfg.reveal_deadline = cfg.commit_deadline + 10;
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract).start_auction(&cfg, &vec_of(&env, &members), &1u32);
}

#[test]
#[should_panic(expected = "max_discount_bps exceeds 100%")]
fn test_max_discount_above_denominator_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    let mut cfg = config(&env, &organizer);
    cfg.max_discount_bps = 10_001;
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract).start_auction(&cfg, &vec_of(&env, &members), &1u32);
}

#[test]
fn test_commit_records_single_commitment() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 500, 1, 1);

    let client = BidEngineClient::new(&env, &contract);
    assert!(client.get_commitment(&members[0]).is_some());
    assert!(client.get_commitment(&members[1]).is_none());
    let auction = client.get_auction().unwrap();
    assert_eq!(auction.commit_count, 1);
    assert_eq!(auction.phase, AuctionPhase::Commit);
}

#[test]
fn test_all_commits_advance_to_reveal() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));

    let client = BidEngineClient::new(&env, &contract);
    assert_eq!(client.get_phase(), AuctionPhase::Reveal);
    assert_eq!(client.get_auction().unwrap().commit_count, 3);
}

/// The core anti-frontrunning property: while bids are sealed, neither the
/// individual bid nor the field is observable.
#[test]
fn test_sealed_bids_are_hidden_until_reveal() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));

    let client = BidEngineClient::new(&env, &contract);
    assert_eq!(client.get_all_bids().len(), 0);
    assert!(client.get_bid(&members[0]).is_none());
    assert!(client.get_commitment(&members[0]).is_some());
}

#[test]
fn test_commit_and_reveal_records_bid() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));
    reveal(&env, &contract, &members[0], 500, 1, 1);

    let bid = BidEngineClient::new(&env, &contract)
        .get_bid(&members[0])
        .unwrap();
    assert_eq!(bid.member, members[0]);
    assert_eq!(bid.discount_bps, 500);
    assert_eq!(bid.round, 1);
}

#[test]
#[should_panic(expected = "Member already committed a bid")]
fn test_duplicate_commit_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 500, 1, 1);
    commit(&env, &contract, &members[0], 700, 2, 1);
}

#[test]
#[should_panic(expected = "Only circle members may bid")]
fn test_non_member_commit_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);
    let attacker = Address::generate(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &attacker, 500, 1, 1);
}

/// A Sybil attacker controls many addresses but none are on the roster, so none
/// can bid. Roster membership is the on-chain eligibility gate.
#[test]
#[should_panic(expected = "Only circle members may bid")]
fn test_sybil_address_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);
    let sybil = Address::generate(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &sybil, 2_900, 9, 1);
}

#[test]
#[should_panic(expected = "Bid round does not match the open auction")]
fn test_commit_wrong_round_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 500, 1, 2);
}

#[test]
#[should_panic(expected = "Commit phase is closed")]
fn test_commit_after_deadline_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    env.ledger().set_timestamp(COMMIT_DEADLINE + 1);
    commit(&env, &contract, &members[0], 500, 1, 1);
}

#[test]
#[should_panic(expected = "Member has not committed a bid")]
fn test_reveal_without_commit_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    env.ledger().set_timestamp(COMMIT_DEADLINE + 1);
    reveal(&env, &contract, &members[0], 500, 1, 1);
}

#[test]
#[should_panic(expected = "Reveal phase is not open")]
fn test_reveal_before_phase_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 500, 1, 1);
    reveal(&env, &contract, &members[0], 500, 1, 1);
}

#[test]
#[should_panic(expected = "Reveal does not match commitment")]
fn test_reveal_wrong_nonce_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 500, 1, 1);
    env.ledger().set_timestamp(COMMIT_DEADLINE + 1);
    reveal(&env, &contract, &members[0], 500, 2, 1);
}

#[test]
#[should_panic(expected = "Discount exceeds maximum allowed")]
fn test_discount_above_max_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 5_000, 1, 1);
    env.ledger().set_timestamp(COMMIT_DEADLINE + 1);
    reveal(&env, &contract, &members[0], 5_000, 1, 1);
}

#[test]
#[should_panic(expected = "Discount below the auction reserve")]
fn test_discount_below_reserve_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 50, 1, 1);
    env.ledger().set_timestamp(COMMIT_DEADLINE + 1);
    reveal(&env, &contract, &members[0], 50, 1, 1);
}

#[test]
#[should_panic(expected = "Reveal deadline has passed")]
fn test_reveal_after_deadline_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));
    env.ledger().set_timestamp(REVEAL_DEADLINE + 1);
    reveal(&env, &contract, &members[0], 500, 1, 1);
}

#[test]
#[should_panic(expected = "Member already revealed a bid")]
fn test_duplicate_reveal_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit(&env, &contract, &members[0], 500, 1, 1);
    env.ledger().set_timestamp(COMMIT_DEADLINE + 1);
    reveal(&env, &contract, &members[0], 500, 1, 1);
    reveal(&env, &contract, &members[0], 500, 1, 1);
}

#[test]
fn test_resolve_highest_discount_wins() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 1_500, 800));
    reveal(&env, &contract, &members[0], 500, 1, 1);
    reveal(&env, &contract, &members[1], 1_500, 2, 1);
    reveal(&env, &contract, &members[2], 800, 3, 1);

    let result = BidEngineClient::new(&env, &contract).resolve_auction();

    assert_eq!(result.winner, members[1]);
    assert_eq!(result.winning_discount_bps, 1_500);
    // 1500 / (3 - 1) = 750
    assert_eq!(result.discount_per_member, 750);
    assert_eq!(
        BidEngineClient::new(&env, &contract).get_state(),
        BidState::Closed
    );
}

#[test]
fn test_resolve_deterministic_tie_break() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (1_000, 1_000, 1_000));
    reveal(&env, &contract, &members[0], 1_000, 1, 1);
    reveal(&env, &contract, &members[1], 1_000, 2, 1);
    reveal(&env, &contract, &members[2], 1_000, 3, 1);

    let result = BidEngineClient::new(&env, &contract).resolve_auction();

    let expected = if members[0] < members[1] && members[0] < members[2] {
        members[0].clone()
    } else if members[1] < members[0] && members[1] < members[2] {
        members[1].clone()
    } else {
        members[2].clone()
    };
    assert_eq!(result.winner, expected);
}

#[test]
#[should_panic(expected = "Reveal window is still open")]
fn test_resolve_before_deadline_with_partial_reveals_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));
    reveal(&env, &contract, &members[0], 500, 1, 1);

    BidEngineClient::new(&env, &contract).resolve_auction();
}

#[test]
fn test_resolve_after_deadline_with_partial_reveals_succeeds() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (700, 800, 300));
    reveal(&env, &contract, &members[0], 700, 1, 1);

    env.ledger().set_timestamp(REVEAL_DEADLINE + 1);
    let result = BidEngineClient::new(&env, &contract).resolve_auction();

    assert_eq!(result.winner, members[0]);
    assert_eq!(result.winning_discount_bps, 700);
    assert_eq!(result.discount_per_member, 350);
}

#[test]
#[should_panic(expected = "No valid bids to resolve")]
fn test_resolve_with_no_valid_bids_rejected() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    env.ledger().set_timestamp(REVEAL_DEADLINE + 1);
    BidEngineClient::new(&env, &contract).resolve_auction();
}

#[test]
fn test_get_all_bids() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));
    reveal(&env, &contract, &members[0], 500, 1, 1);
    reveal(&env, &contract, &members[1], 800, 2, 1);

    assert_eq!(
        BidEngineClient::new(&env, &contract).get_all_bids().len(),
        2
    );
}

#[test]
fn test_bids_cleared_after_resolution() {
    let env = Env::default();
    let contract = deploy(&env);
    let organizer = Address::generate(&env);
    let members = roster(&env);

    start(&env, &contract, &organizer, &members);
    commit_all(&env, &contract, &members, (500, 800, 300));
    reveal(&env, &contract, &members[0], 500, 1, 1);
    reveal(&env, &contract, &members[1], 800, 2, 1);
    reveal(&env, &contract, &members[2], 300, 3, 1);

    BidEngineClient::new(&env, &contract).resolve_auction();

    let client = BidEngineClient::new(&env, &contract);
    assert_eq!(client.get_all_bids().len(), 0);
    assert!(client.get_bid(&members[0]).is_none());
    assert!(client.get_commitment(&members[0]).is_none());
    assert_eq!(client.get_phase(), AuctionPhase::Closed);
}
