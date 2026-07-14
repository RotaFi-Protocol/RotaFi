#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

fn deploy(env: &Env) -> Address {
    env.register(BidEngine, ())
}

fn start_auction(env: &Env, contract_id: &Address, circle_id: u32, max_discount: u32, round: u32) {
    let config = AuctionConfig {
        circle_id,
        member_cap: 5,
        max_discount_bps: max_discount,
    };
    BidEngineClient::new(env, contract_id).start_auction(&config, &round);
}

#[test]
fn test_start_auction() {
    let env = Env::default();
    let contract_id = deploy(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    let state = BidEngineClient::new(&env, &contract_id).get_state();
    assert_eq!(state, BidState::Open);
}

#[test]
#[should_panic(expected = "Auction already in progress")]
fn test_double_start() {
    let env = Env::default();
    let contract_id = deploy(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);
    start_auction(&env, &contract_id, 1, 3000, 1);
}

#[test]
fn test_submit_bid_success() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&member, &500u32, &1u32);

    let bid = BidEngineClient::new(&env, &contract_id).get_bid(&member).unwrap();
    assert_eq!(bid.member, member);
    assert_eq!(bid.discount_bps, 500);
    assert_eq!(bid.round, 1);
}

#[test]
#[should_panic(expected = "Discount exceeds maximum allowed")]
fn test_excessive_discount() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&member, &5000u32, &1u32);
}

#[test]
#[should_panic(expected = "Member already submitted a bid for this round")]
fn test_duplicate_bid() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&member, &500u32, &1u32);
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&member, &700u32, &1u32);
}

#[test]
fn test_resolve_auction_highest_discount_wins() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);
    let m3 = Address::generate(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&m1, &500u32, &1u32);
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&m2, &1500u32, &1u32);
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&m3, &800u32, &1u32);

    let result = BidEngineClient::new(&env, &contract_id).resolve_auction(&5u32);

    assert_eq!(result.winner, m2);
    assert_eq!(result.winning_discount_bps, 1500);
    assert_eq!(result.discount_per_member, 375); // 1500 / 4 = 375

    // Auction should be closed
    let state = BidEngineClient::new(&env, &contract_id).get_state();
    assert_eq!(state, BidState::Closed);
}

#[test]
fn test_resolve_with_single_bidder() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let m1 = Address::generate(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&m1, &1000u32, &1u32);

    let result = BidEngineClient::new(&env, &contract_id).resolve_auction(&5u32);

    assert_eq!(result.winner, m1);
    assert_eq!(result.winning_discount_bps, 1000);
    assert_eq!(result.discount_per_member, 250); // 1000 / 4 = 250
}

#[test]
#[should_panic(expected = "No bids placed")]
fn test_resolve_with_no_bids() {
    let env = Env::default();
    let contract_id = deploy(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    BidEngineClient::new(&env, &contract_id).resolve_auction(&5u32);
}

#[test]
fn test_get_all_bids() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);

    start_auction(&env, &contract_id, 1, 3000, 1);

    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&m1, &500u32, &1u32);
    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&m2, &700u32, &1u32);

    let all_bids = BidEngineClient::new(&env, &contract_id).get_all_bids();
    assert_eq!(all_bids.len(), 2);
}

#[test]
fn test_bids_cleared_after_resolution() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let m1 = Address::generate(&env);
    start_auction(&env, &contract_id, 1, 3000, 1);

    env.mock_all_auths();
    BidEngineClient::new(&env, &contract_id).submit_bid(&m1, &500u32, &1u32);

    BidEngineClient::new(&env, &contract_id).resolve_auction(&5u32);

    let all_bids = BidEngineClient::new(&env, &contract_id).get_all_bids();
    assert_eq!(all_bids.len(), 0);

    let bid = BidEngineClient::new(&env, &contract_id).get_bid(&m1);
    assert!(bid.is_none());
}
