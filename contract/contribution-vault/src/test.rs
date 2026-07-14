#![cfg(test)]

use super::*;
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{token, Address, Env};

fn deploy_vault(env: &Env) -> Address {
    env.register(ContributionVault, ())
}

fn create_vault_config_with_token(env: &Env) -> (VaultConfig, Address) {
    let admin = Address::generate(env);
    let token_addr = env.register_stellar_asset_contract_v2(admin).address();
    let config = VaultConfig {
        circle_id: 1,
        token_address: token_addr.clone(),
        contribution_per_member: 100_000_000,
        member_cap: 3,
        total_rounds: 3,
        min_collateral: 50_000_000,
        round_length_seconds: 604800,
        grace_period_seconds: 86400,
    };
    (config, token_addr)
}

fn create_vault_config(env: &Env) -> VaultConfig {
    create_vault_config_with_token(env).0
}

fn deploy_and_init(env: &Env) -> (Address, VaultConfig, Address) {
    let contract_id = deploy_vault(env);
    let (config, token_addr) = create_vault_config_with_token(env);
    env.mock_all_auths();
    ContributionVaultClient::new(env, &contract_id).initialize(&config);
    (contract_id, config, token_addr)
}

fn mint_and_fund(env: &Env, token_addr: &Address, member: &Address, amount: i128) {
    let sac = token::StellarAssetClient::new(env, token_addr);
    env.mock_all_auths();
    sac.mint(member, &amount);
}

fn setup_member(env: &Env, token_addr: &Address, collateral: i128, contribution: i128) -> Address {
    let member = Address::generate(env);
    mint_and_fund(env, token_addr, &member, collateral + contribution);
    member
}

fn join_as_member(env: &Env, contract_id: &Address, token_addr: &Address, member: &Address) {
    env.mock_all_auths();
    ContributionVaultClient::new(env, contract_id).join_vault(member, token_addr);
}

fn contribute_as_member(env: &Env, contract_id: &Address, token_addr: &Address, member: &Address) {
    env.mock_all_auths();
    ContributionVaultClient::new(env, contract_id).contribute(member, token_addr);
}

fn release_payout(env: &Env, contract_id: &Address, token_addr: &Address, winner: &Address) {
    env.mock_all_auths();
    ContributionVaultClient::new(env, contract_id).release_payout(winner, token_addr);
}

fn slash_default(env: &Env, contract_id: &Address, defaulter: &Address, percent: &u32) -> i128 {
    env.mock_all_auths();
    ContributionVaultClient::new(env, contract_id).slash_default(defaulter, percent)
}

fn get_vault_state(env: &Env, contract_id: &Address) -> Vault {
    ContributionVaultClient::new(env, contract_id).get_vault()
}

fn get_member_info(env: &Env, contract_id: &Address, member: &Address) -> Option<MemberInfo> {
    ContributionVaultClient::new(env, contract_id).get_member(member)
}

fn all_paid(env: &Env, contract_id: &Address) -> bool {
    ContributionVaultClient::new(env, contract_id).all_paid()
}

fn fill_vault(env: &Env, contract_id: &Address, config: &VaultConfig, token_addr: &Address) -> (Address, Address, Address) {
    let m1 = setup_member(env, token_addr, config.min_collateral, config.contribution_per_member * 3);
    let m2 = setup_member(env, token_addr, config.min_collateral, config.contribution_per_member * 3);
    let m3 = setup_member(env, token_addr, config.min_collateral, config.contribution_per_member * 3);
    join_as_member(env, contract_id, token_addr, &m1);
    join_as_member(env, contract_id, token_addr, &m2);
    join_as_member(env, contract_id, token_addr, &m3);
    (m1, m2, m3)
}

#[test]
fn test_initialize_vault() {
    let env = Env::default();
    let contract_id = deploy_vault(&env);
    let config = create_vault_config(&env);
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &contract_id).initialize(&config);
    let vault = get_vault_state(&env, &contract_id);
    assert_eq!(vault.config.circle_id, 1);
    assert_eq!(vault.state, VaultState::Setup);
}

#[test]
#[should_panic(expected = "Vault already initialized")]
fn test_double_initialize() {
    let env = Env::default();
    let contract_id = deploy_vault(&env);
    let config = create_vault_config(&env);
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &contract_id).initialize(&config);
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &contract_id).initialize(&config);
}

#[test]
fn test_join_vault_success() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let member = setup_member(&env, &token_addr, config.min_collateral, config.contribution_per_member);
    join_as_member(&env, &contract_id, &token_addr, &member);
    let info = get_member_info(&env, &contract_id, &member).unwrap();
    assert_eq!(info.collateral_staked, config.min_collateral);
    assert!(info.is_active);
}

#[test]
#[should_panic(expected = "Member already joined")]
fn test_duplicate_join() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let member = setup_member(&env, &token_addr, config.min_collateral, config.contribution_per_member);
    join_as_member(&env, &contract_id, &token_addr, &member);
    join_as_member(&env, &contract_id, &token_addr, &member);
}

#[test]
fn test_vault_activates_when_full() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let m1 = setup_member(&env, &token_addr, config.min_collateral, config.contribution_per_member);
    let m2 = setup_member(&env, &token_addr, config.min_collateral, config.contribution_per_member);
    let m3 = setup_member(&env, &token_addr, config.min_collateral, config.contribution_per_member);
    join_as_member(&env, &contract_id, &token_addr, &m1);
    join_as_member(&env, &contract_id, &token_addr, &m2);
    assert_eq!(get_vault_state(&env, &contract_id).state, VaultState::Setup);
    join_as_member(&env, &contract_id, &token_addr, &m3);
    let vault = get_vault_state(&env, &contract_id);
    assert_eq!(vault.state, VaultState::Active);
    assert_eq!(vault.current_round, 1);
}

#[test]
fn test_contribute_success() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, _m2, _m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    let paid = ContributionVaultClient::new(&env, &contract_id).has_paid(&1u32, &m1);
    assert!(paid);
    assert_eq!(get_vault_state(&env, &contract_id).members_paid_current_round, 1);
}

#[test]
#[should_panic(expected = "Not a member of this vault")]
fn test_non_member_contribute() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let _ = fill_vault(&env, &contract_id, &config, &token_addr);
    let outsider = setup_member(&env, &token_addr, config.min_collateral, config.contribution_per_member);
    contribute_as_member(&env, &contract_id, &token_addr, &outsider);
}

#[test]
#[should_panic(expected = "Already contributed this round")]
fn test_double_contribute() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, _m2, _m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
}

#[test]
fn test_release_payout_happy_path() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, m2, m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    contribute_as_member(&env, &contract_id, &token_addr, &m2);
    contribute_as_member(&env, &contract_id, &token_addr, &m3);
    assert!(all_paid(&env, &contract_id));
    release_payout(&env, &contract_id, &token_addr, &m1);
    let info = get_member_info(&env, &contract_id, &m1).unwrap();
    assert!(info.has_received_pot);
    let vault = get_vault_state(&env, &contract_id);
    assert_eq!(vault.current_round, 2);
    assert_eq!(vault.members_paid_current_round, 0);
}

#[test]
#[should_panic(expected = "Not all members paid and grace period not expired")]
fn test_release_payout_before_all_paid() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, _m2, _m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    release_payout(&env, &contract_id, &token_addr, &m1);
}

#[test]
#[should_panic(expected = "Winner already received pot")]
fn test_release_payout_twice_same_winner() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, m2, m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    contribute_as_member(&env, &contract_id, &token_addr, &m2);
    contribute_as_member(&env, &contract_id, &token_addr, &m3);
    release_payout(&env, &contract_id, &token_addr, &m1);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    contribute_as_member(&env, &contract_id, &token_addr, &m2);
    contribute_as_member(&env, &contract_id, &token_addr, &m3);
    release_payout(&env, &contract_id, &token_addr, &m1);
}

#[test]
fn test_slash_default() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, m2, m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    contribute_as_member(&env, &contract_id, &token_addr, &m2);
    let now = env.ledger().timestamp();
    let grace_end = now + config.round_length_seconds + config.grace_period_seconds;
    env.ledger().set_timestamp(grace_end + 1);
    let slash_amount = slash_default(&env, &contract_id, &m3, &50u32);
    assert!(slash_amount > 0);
    assert_eq!(slash_amount, config.min_collateral / 2);
    let info = get_member_info(&env, &contract_id, &m3).unwrap();
    assert_eq!(info.rounds_missed, 1);
    assert_eq!(info.collateral_staked, config.min_collateral - slash_amount);
}

#[test]
#[should_panic(expected = "Member has already paid this round")]
fn test_slash_member_who_paid() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, _m2, _m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    contribute_as_member(&env, &contract_id, &token_addr, &m1);
    let now = env.ledger().timestamp();
    let grace_end = now + config.round_length_seconds + config.grace_period_seconds;
    env.ledger().set_timestamp(grace_end + 1);
    slash_default(&env, &contract_id, &m1, &50u32);
}

#[test]
fn test_vault_completes() {
    let env = Env::default();
    let (contract_id, config, token_addr) = deploy_and_init(&env);
    let (m1, m2, m3) = fill_vault(&env, &contract_id, &config, &token_addr);
    let winners = [&m1, &m2, &m3];
    for round in 0..3 {
        contribute_as_member(&env, &contract_id, &token_addr, &m1);
        contribute_as_member(&env, &contract_id, &token_addr, &m2);
        contribute_as_member(&env, &contract_id, &token_addr, &m3);
        release_payout(&env, &contract_id, &token_addr, winners[round]);
    }
    assert_eq!(get_vault_state(&env, &contract_id).state, VaultState::Completed);
}

#[test]
#[should_panic(expected = "Vault must have at least 2 members")]
fn test_initialize_with_one_member() {
    let env = Env::default();
    let contract_id = deploy_vault(&env);
    let mut config = create_vault_config(&env);
    config.member_cap = 1;
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &contract_id).initialize(&config);
}

#[test]
#[should_panic(expected = "Contribution amount must be positive")]
fn test_initialize_with_zero_contribution() {
    let env = Env::default();
    let contract_id = deploy_vault(&env);
    let mut config = create_vault_config(&env);
    config.contribution_per_member = 0;
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &contract_id).initialize(&config);
}
