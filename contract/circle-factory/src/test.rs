#![cfg(test)]

use super::*;
use soroban_sdk::{Address, Env};

fn create_test_config(_env: &Env, payout_method: PayoutMethod) -> CircleConfig {
    CircleConfig {
        contribution_amount: 100_000_000, // 100 USDC (7 decimals)
        round_length_seconds: 604800,      // 1 week
        member_cap: 5,
        payout_method,
        min_collateral: 50_000_000,        // 50 USDC
        grace_period_seconds: 86400,        // 1 day
    }
}

fn deploy(env: &Env) -> Address {
    let contract_id = env.register(CircleFactory, ());
    contract_id
}

#[test]
fn test_create_circle_happy_path() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let config = create_test_config(&env, PayoutMethod::Lottery);
    let circle_id = CircleFactoryClient::new(&env, &contract_id).create_circle(&config);

    assert_eq!(circle_id, 1);

    let circle = CircleFactoryClient::new(&env, &contract_id).get_circle(&circle_id);
    assert!(circle.is_some());
    let circle = circle.unwrap();
    assert_eq!(circle.id, 1);
    assert_eq!(circle.config.member_cap, 5);
    assert_eq!(circle.config.payout_method, PayoutMethod::Lottery);
    assert_eq!(circle.active, false);
    assert_eq!(circle.organizer, contract_id);
}

#[test]
fn test_multiple_circles() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let config = create_test_config(&env, PayoutMethod::Lottery);
    let id1 = CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
    let id2 = CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
    let id3 = CircleFactoryClient::new(&env, &contract_id).create_circle(&config);

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(id3, 3);
    assert_eq!(CircleFactoryClient::new(&env, &contract_id).circle_count(), 3);
}

#[test]
#[should_panic(expected = "Circle must have at least 2 members")]
fn test_circle_with_zero_members() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let mut config = create_test_config(&env, PayoutMethod::Lottery);
    config.member_cap = 0;
    CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
}

#[test]
#[should_panic(expected = "Circle must have at least 2 members")]
fn test_circle_with_one_member() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let mut config = create_test_config(&env, PayoutMethod::Lottery);
    config.member_cap = 1;
    CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
}

#[test]
#[should_panic(expected = "Contribution amount must be positive")]
fn test_circle_with_zero_contribution() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let mut config = create_test_config(&env, PayoutMethod::Lottery);
    config.contribution_amount = 0;
    CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
}

#[test]
#[should_panic(expected = "Contribution amount must be positive")]
fn test_circle_with_negative_contribution() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let mut config = create_test_config(&env, PayoutMethod::Lottery);
    config.contribution_amount = -1;
    CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
}

#[test]
#[should_panic(expected = "Round length must be positive")]
fn test_circle_with_zero_round_length() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let mut config = create_test_config(&env, PayoutMethod::Lottery);
    config.round_length_seconds = 0;
    CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
}

#[test]
fn test_different_payout_methods() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let config = create_test_config(&env, PayoutMethod::SealedBidAuction);
    let id = CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
    let circle = CircleFactoryClient::new(&env, &contract_id).get_circle(&id).unwrap();
    assert_eq!(circle.config.payout_method, PayoutMethod::SealedBidAuction);

    let config = create_test_config(&env, PayoutMethod::PriorityBased);
    let id = CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
    let circle = CircleFactoryClient::new(&env, &contract_id).get_circle(&id).unwrap();
    assert_eq!(circle.config.payout_method, PayoutMethod::PriorityBased);
}

#[test]
fn test_activate_circle() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let config = create_test_config(&env, PayoutMethod::Lottery);
    let id = CircleFactoryClient::new(&env, &contract_id).create_circle(&config);
    assert!(!CircleFactoryClient::new(&env, &contract_id).get_circle(&id).unwrap().active);

    CircleFactoryClient::new(&env, &contract_id).activate_circle(&id);
    assert!(CircleFactoryClient::new(&env, &contract_id).get_circle(&id).unwrap().active);
}

#[test]
fn test_get_nonexistent_circle() {
    let env = Env::default();
    let contract_id = deploy(&env);

    let circle = CircleFactoryClient::new(&env, &contract_id).get_circle(&999);
    assert!(circle.is_none());
}

#[test]
fn test_circle_count_starts_at_zero() {
    let env = Env::default();
    let contract_id = deploy(&env);

    assert_eq!(CircleFactoryClient::new(&env, &contract_id).circle_count(), 0);
}
