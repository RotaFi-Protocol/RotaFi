#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, Env, Vec};

fn deploy(env: &Env) -> Address {
    env.register(ProtocolConfig, ())
}

fn generate_owners(env: &Env, count: u32) -> Vec<Address> {
    let mut owners = Vec::new(env);
    for _ in 0..count {
        owners.push_back(Address::generate(env));
    }
    owners
}

fn sample_params() -> ProtocolParams {
    ProtocolParams {
        min_member_cap: 2,
        max_member_cap: 20,
        min_collateral: 100,
        max_collateral: 10_000,
        fee_bps: 100,
        slash_bps: 5_000,
    }
}

fn initialized(env: &Env, threshold: u32) -> (Address, Vec<Address>) {
    let owners = generate_owners(env, 3);
    let contract_id = deploy(env);
    ProtocolConfigClient::new(env, &contract_id).initialize(&owners, &threshold, &sample_params());
    (contract_id, owners)
}

#[test]
fn test_initialize_stores_params() {
    let env = Env::default();
    let (contract_id, _) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let params = client.get_params();
    assert_eq!(params.min_member_cap, 2);
    assert_eq!(params.max_member_cap, 20);
    assert_eq!(params.min_collateral, 100);
    assert_eq!(params.max_collateral, 10_000);
    assert_eq!(params.fee_bps, 100);
    assert_eq!(params.slash_bps, 5_000);
}

#[test]
fn test_initialize_stores_multisig() {
    let env = Env::default();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    assert_eq!(client.get_threshold(), 2);
    assert_eq!(client.get_owners(), owners);

    let multisig = client.get_multisig();
    assert_eq!(multisig.owners, owners);
    assert_eq!(multisig.threshold, 2);
}

#[test]
fn test_is_owner() {
    let env = Env::default();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    assert!(client.is_owner(&owners.get(0).unwrap()));
    assert!(client.is_owner(&owners.get(1).unwrap()));
    assert!(!client.is_owner(&Address::generate(&env)));
}

#[test]
#[should_panic(expected = "Protocol config already initialized")]
fn test_initialize_twice_panics() {
    let env = Env::default();
    let (contract_id, owners) = initialized(&env, 2);
    ProtocolConfigClient::new(&env, &contract_id).initialize(&owners, &2u32, &sample_params());
}

#[test]
#[should_panic(expected = "At least one owner required")]
fn test_initialize_without_owners_panics() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let empty: Vec<Address> = Vec::new(&env);
    ProtocolConfigClient::new(&env, &contract_id).initialize(&empty, &0u32, &sample_params());
}

#[test]
#[should_panic(expected = "Threshold must be positive")]
fn test_initialize_with_zero_threshold_panics() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let owners = generate_owners(&env, 3);
    ProtocolConfigClient::new(&env, &contract_id).initialize(&owners, &0u32, &sample_params());
}

#[test]
#[should_panic(expected = "Threshold cannot exceed owner count")]
fn test_initialize_threshold_exceeds_owners_panics() {
    let env = Env::default();
    let contract_id = deploy(&env);
    let owners = generate_owners(&env, 2);
    ProtocolConfigClient::new(&env, &contract_id).initialize(&owners, &3u32, &sample_params());
}

#[test]
fn test_check_member_cap() {
    let env = Env::default();
    let (contract_id, _) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    assert!(client.check_member_cap(&2u32));
    assert!(client.check_member_cap(&20u32));
    assert!(!client.check_member_cap(&1u32));
    assert!(!client.check_member_cap(&21u32));
}

#[test]
fn test_check_collateral() {
    let env = Env::default();
    let (contract_id, _) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    assert!(client.check_collateral(&100i128));
    assert!(client.check_collateral(&10_000i128));
    assert!(!client.check_collateral(&99i128));
    assert!(!client.check_collateral(&10_001i128));
}

#[test]
fn test_get_fee_and_slash() {
    let env = Env::default();
    let (contract_id, _) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    assert_eq!(client.get_fee_bps(), 100);
    assert_eq!(client.get_slash_bps(), 5_000);
}

#[test]
fn test_update_params() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let approvers = first_two(&env, &owners);
    let updated = ProtocolParams {
        fee_bps: 250,
        ..sample_params()
    };
    client.update_params(&approvers, &updated);

    assert_eq!(client.get_params().fee_bps, 250);
}

#[test]
#[should_panic(expected = "Insufficient multisig approvals")]
fn test_update_params_insufficient_approvals() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 3);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let mut approvers = Vec::new(&env);
    approvers.push_back(owners.get(0).unwrap());
    client.update_params(&approvers, &sample_params());
}

#[test]
#[should_panic(expected = "Insufficient multisig approvals")]
fn test_update_params_duplicate_approvals_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let mut approvers = Vec::new(&env);
    let owner = owners.get(0).unwrap();
    approvers.push_back(owner.clone());
    approvers.push_back(owner);
    client.update_params(&approvers, &sample_params());
}

#[test]
#[should_panic(expected = "Approver is not an owner")]
fn test_update_params_non_owner_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 1);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let mut approvers = Vec::new(&env);
    approvers.push_back(owners.get(0).unwrap());
    approvers.push_back(Address::generate(&env));
    client.update_params(&approvers, &sample_params());
}

#[test]
#[should_panic(expected = "max_member_cap below min_member_cap")]
fn test_update_params_invalid_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let approvers = first_two(&env, &owners);
    let invalid = ProtocolParams {
        min_member_cap: 10,
        max_member_cap: 5,
        ..sample_params()
    };
    client.update_params(&approvers, &invalid);
}

#[test]
#[should_panic]
fn test_update_params_requires_authorization() {
    let env = Env::default();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let approvers = first_two(&env, &owners);
    client.update_params(&approvers, &sample_params());
}

fn first_two(env: &Env, owners: &Vec<Address>) -> Vec<Address> {
    let mut approvers = Vec::new(env);
    approvers.push_back(owners.get(0).unwrap());
    approvers.push_back(owners.get(1).unwrap());
    approvers
}
