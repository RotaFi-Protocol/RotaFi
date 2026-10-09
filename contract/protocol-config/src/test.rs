#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, Vec};

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

#[test]
fn test_set_fee_bps() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_fee_bps(&first_two(&env, &owners), &300u32);

    assert_eq!(client.get_fee_bps(), 300);
    assert_eq!(client.get_params().slash_bps, 5_000);
}

#[test]
#[should_panic(expected = "fee_bps exceeds maximum")]
fn test_set_fee_bps_above_max_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_fee_bps(&first_two(&env, &owners), &(MAX_FEE_BPS + 1));
}

#[test]
fn test_set_slash_bps() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_slash_bps(&first_two(&env, &owners), &7_500u32);

    assert_eq!(client.get_slash_bps(), 7_500);
    assert_eq!(client.get_params().fee_bps, 100);
}

#[test]
#[should_panic(expected = "slash_bps exceeds maximum")]
fn test_set_slash_bps_above_max_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_slash_bps(&first_two(&env, &owners), &(MAX_SLASH_BPS + 1));
}

#[test]
fn test_set_member_cap_bounds() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_member_cap_bounds(&first_two(&env, &owners), &5u32, &30u32);

    assert!(client.check_member_cap(&5u32));
    assert!(client.check_member_cap(&30u32));
    assert!(!client.check_member_cap(&4u32));
}

#[test]
#[should_panic(expected = "max_member_cap below min_member_cap")]
fn test_set_member_cap_bounds_inverted_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_member_cap_bounds(&first_two(&env, &owners), &30u32, &5u32);
}

#[test]
#[should_panic(expected = "min_member_cap below floor")]
fn test_set_member_cap_bounds_below_floor_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_member_cap_bounds(&first_two(&env, &owners), &1u32, &5u32);
}

#[test]
fn test_set_collateral_bounds() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_collateral_bounds(&first_two(&env, &owners), &500i128, &20_000i128);

    assert!(client.check_collateral(&500i128));
    assert!(client.check_collateral(&20_000i128));
    assert!(!client.check_collateral(&499i128));
}

#[test]
#[should_panic(expected = "max_collateral below min_collateral")]
fn test_set_collateral_bounds_inverted_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_collateral_bounds(&first_two(&env, &owners), &20_000i128, &500i128);
}

#[test]
#[should_panic(expected = "min_collateral cannot be negative")]
fn test_set_collateral_bounds_negative_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_collateral_bounds(&first_two(&env, &owners), &-1i128, &500i128);
}

#[test]
fn test_add_owner() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let count_before = client.get_owners().len();
    let newcomer = Address::generate(&env);
    client.add_owner(&first_two(&env, &owners), &newcomer);

    assert_eq!(client.get_owners().len(), count_before + 1);
    assert!(client.is_owner(&newcomer));
}

#[test]
#[should_panic(expected = "Already an owner")]
fn test_add_owner_duplicate_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let existing = owners.get(0).unwrap();
    client.add_owner(&first_two(&env, &owners), &existing);
}

#[test]
fn test_remove_owner() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let third = owners.get(2).unwrap();
    client.remove_owner(&first_two(&env, &owners), &third);

    assert!(!client.is_owner(&third));
    assert_eq!(client.get_owners().len(), 2);
}

#[test]
#[should_panic(expected = "Address is not an owner")]
fn test_remove_owner_unknown_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.remove_owner(&first_two(&env, &owners), &Address::generate(&env));
}

#[test]
#[should_panic(expected = "Removal would drop below threshold")]
fn test_remove_owner_below_threshold_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 3);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let third = owners.get(2).unwrap();
    client.remove_owner(&owners, &third);
}

#[test]
fn test_set_threshold() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_threshold(&first_two(&env, &owners), &3u32);

    assert_eq!(client.get_threshold(), 3);
}

#[test]
#[should_panic(expected = "Threshold must be positive")]
fn test_set_threshold_zero_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_threshold(&first_two(&env, &owners), &0u32);
}

#[test]
#[should_panic(expected = "Threshold cannot exceed owner count")]
fn test_set_threshold_exceeds_owners_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.set_threshold(&first_two(&env, &owners), &4u32);
}

#[test]
#[should_panic(expected = "Insufficient multisig approvals")]
fn test_upgrade_insufficient_approvals_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 3);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let mut approvers = Vec::new(&env);
    approvers.push_back(owners.get(0).unwrap());
    let wasm_hash: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);
    client.upgrade(&approvers, &wasm_hash);
}

#[test]
#[should_panic]
fn test_upgrade_requires_authorization() {
    let env = Env::default();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let wasm_hash: BytesN<32> = BytesN::from_array(&env, &[0u8; 32]);
    client.upgrade(&first_two(&env, &owners), &wasm_hash);
}

#[test]
fn test_add_and_query_supported_token() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let token = Address::generate(&env);
    client.add_supported_token(&first_two(&env, &owners), &token, &symbol_short!("EURC"), &7u32);

    assert!(client.is_token_supported(&token));
    let info = client.get_token_info(&token).unwrap();
    assert_eq!(info.address, token);
    assert_eq!(info.symbol, symbol_short!("EURC"));
    assert_eq!(info.decimals, 7);
}

#[test]
fn test_get_supported_tokens_returns_all() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let token_a = Address::generate(&env);
    let token_b = Address::generate(&env);
    client.add_supported_token(&first_two(&env, &owners), &token_a, &symbol_short!("USDC"), &7u32);
    client.add_supported_token(&first_two(&env, &owners), &token_b, &symbol_short!("XLM"), &7u32);

    let tokens = client.get_supported_tokens();
    assert_eq!(tokens.len(), 2);
}

#[test]
fn test_remove_supported_token() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let token = Address::generate(&env);
    client.add_supported_token(&first_two(&env, &owners), &token, &symbol_short!("USDC"), &7u32);
    assert!(client.is_token_supported(&token));

    client.remove_supported_token(&first_two(&env, &owners), &token);
    assert!(!client.is_token_supported(&token));
    assert!(client.get_token_info(&token).is_none());
    assert_eq!(client.get_supported_tokens().len(), 0);
}

#[test]
#[should_panic(expected = "Token already supported")]
fn test_add_supported_token_duplicate_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let token = Address::generate(&env);
    client.add_supported_token(&first_two(&env, &owners), &token, &symbol_short!("USDC"), &7u32);
    client.add_supported_token(&first_two(&env, &owners), &token, &symbol_short!("USD"), &7u32);
}

#[test]
#[should_panic(expected = "Token is not supported")]
fn test_remove_unsupported_token_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.remove_supported_token(&first_two(&env, &owners), &Address::generate(&env));
}

#[test]
#[should_panic(expected = "Token decimals exceed maximum")]
fn test_add_supported_token_bad_decimals_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 2);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    client.add_supported_token(&first_two(&env, &owners), &Address::generate(&env), &symbol_short!("TKN"), &22u32);
}

#[test]
#[should_panic(expected = "Insufficient multisig approvals")]
fn test_add_supported_token_insufficient_approvals_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let (contract_id, owners) = initialized(&env, 3);
    let client = ProtocolConfigClient::new(&env, &contract_id);

    let mut approvers = Vec::new(&env);
    approvers.push_back(owners.get(0).unwrap());
    client.add_supported_token(&approvers, &Address::generate(&env), &symbol_short!("TKN"), &7u32);
}
