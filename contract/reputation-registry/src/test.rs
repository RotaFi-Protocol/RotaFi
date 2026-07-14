#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env};

fn deploy(env: &Env) -> Address {
    env.register(ReputationRegistry, ())
}

#[test]
fn test_get_score_nonexistent() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    let score = ReputationRegistryClient::new(&env, &contract_id).get_score(&member);
    assert!(score.is_none());
}

#[test]
fn test_new_member_rating_is_100() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    let rating = ReputationRegistryClient::new(&env, &contract_id).get_rating(&member);
    assert_eq!(rating, 100);
}

#[test]
fn test_record_join_creates_score() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);

    let score = ReputationRegistryClient::new(&env, &contract_id)
        .get_score(&member)
        .unwrap();
    assert_eq!(score.circles_joined, 1);
    assert_eq!(score.circles_completed, 0);
    assert_eq!(score.defaults, 0);
}

#[test]
fn test_multiple_joins() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);
    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);
    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);

    let score = ReputationRegistryClient::new(&env, &contract_id)
        .get_score(&member)
        .unwrap();
    assert_eq!(score.circles_joined, 3);
}

#[test]
fn test_record_completion() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);
    ReputationRegistryClient::new(&env, &contract_id).record_completion(&member, &1u32);

    let score = ReputationRegistryClient::new(&env, &contract_id)
        .get_score(&member)
        .unwrap();
    assert_eq!(score.circles_completed, 1);
}

#[test]
fn test_record_default() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);
    ReputationRegistryClient::new(&env, &contract_id)
        .record_default(&member, &1u32, &50000000);

    let score = ReputationRegistryClient::new(&env, &contract_id)
        .get_score(&member)
        .unwrap();
    assert_eq!(score.defaults, 1);
    assert_eq!(score.total_slashed, 50_000_000);
}

#[test]
fn test_rating_perfect() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);
    ReputationRegistryClient::new(&env, &contract_id).record_completion(&member, &1u32);
    ReputationRegistryClient::new(&env, &contract_id).record_completion(&member, &2u32);

    let rating = ReputationRegistryClient::new(&env, &contract_id).get_rating(&member);
    assert_eq!(rating, 100);
}

#[test]
fn test_rating_with_defaults() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);
    ReputationRegistryClient::new(&env, &contract_id).record_completion(&member, &1u32);
    ReputationRegistryClient::new(&env, &contract_id)
        .record_default(&member, &2u32, &100000);

    let rating = ReputationRegistryClient::new(&env, &contract_id).get_rating(&member);
    assert_eq!(rating, 50); // 1 completion + 1 default = 50%
}

#[test]
fn test_multiple_members_independent() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let m1 = Address::generate(&env);
    let m2 = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&m1);
    ReputationRegistryClient::new(&env, &contract_id).record_completion(&m1, &1u32);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&m2);
    ReputationRegistryClient::new(&env, &contract_id)
        .record_default(&m2, &2u32, &50000);

    let s1 = ReputationRegistryClient::new(&env, &contract_id)
        .get_score(&m1)
        .unwrap();
    assert_eq!(s1.circles_completed, 1);
    assert_eq!(s1.defaults, 0);

    let s2 = ReputationRegistryClient::new(&env, &contract_id)
        .get_score(&m2)
        .unwrap();
    assert_eq!(s2.circles_completed, 0);
    assert_eq!(s2.defaults, 1);
}

#[test]
fn test_rating_all_defaults() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_join(&member);
    ReputationRegistryClient::new(&env, &contract_id)
        .record_default(&member, &1u32, &100000);
    ReputationRegistryClient::new(&env, &contract_id)
        .record_default(&member, &2u32, &100000);

    let rating = ReputationRegistryClient::new(&env, &contract_id).get_rating(&member);
    assert_eq!(rating, 0);
}

#[test]
fn test_record_completion_without_join() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let member = Address::generate(&env);

    ReputationRegistryClient::new(&env, &contract_id).record_completion(&member, &1u32);

    let score = ReputationRegistryClient::new(&env, &contract_id)
        .get_score(&member)
        .unwrap();
    assert_eq!(score.circles_completed, 1);
    assert_eq!(score.circles_joined, 0);
}
