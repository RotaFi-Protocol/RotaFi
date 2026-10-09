#![cfg(test)]

use super::*;
use crate::randomness::{commitment_digest, LotteryPhase};
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{token, Address, BytesN, Env};

fn deploy_active_vault(env: &Env) -> (Address, VaultConfig, Address, [Address; 3]) {
    let vault = env.register(ContributionVault, ());
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
    env.mock_all_auths();
    ContributionVaultClient::new(env, &vault).initialize(&config);

    let members = [
        Address::generate(env),
        Address::generate(env),
        Address::generate(env),
    ];
    let fund = config.min_collateral + config.contribution_per_member * 3;
    for member in members.iter() {
        let sac = token::StellarAssetClient::new(env, &token_addr);
        env.mock_all_auths();
        sac.mint(member, &fund);
        env.mock_all_auths();
        ContributionVaultClient::new(env, &vault).join_vault(member, &token_addr);
    }

    (vault, config, token_addr, members)
}

fn current_round(env: &Env, vault: &Address) -> u32 {
    ContributionVaultClient::new(env, vault).get_vault().current_round
}

fn digest(env: &Env, vault: &Address, member: &Address, round: u32, secret: &BytesN<32>) -> BytesN<32> {
    env.as_contract(vault, || commitment_digest(env, member, round, secret))
}

fn commit(env: &Env, vault: &Address, member: &Address, secret: &BytesN<32>) {
    let round = current_round(env, vault);
    let commitment = digest(env, vault, member, round, secret);
    env.mock_all_auths();
    ContributionVaultClient::new(env, vault).commit_randomness(member, &commitment);
}

fn secret(env: &Env, seed: u8) -> BytesN<32> {
    BytesN::from_array(env, &[seed; 32])
}

#[test]
fn test_commit_records_single_commitment() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    commit(&env, &vault, &members[0], &secret(&env, 1));

    let rnd = ContributionVaultClient::new(&env, &vault)
        .get_round_randomness()
        .unwrap();
    assert_eq!(rnd.phase, LotteryPhase::Committing);
    assert_eq!(rnd.commit_count, 1);
    assert_eq!(rnd.eligible_count, 3);
}

#[test]
fn test_all_commits_advance_to_revealing() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    commit(&env, &vault, &members[0], &secret(&env, 1));
    commit(&env, &vault, &members[1], &secret(&env, 2));
    commit(&env, &vault, &members[2], &secret(&env, 3));

    let rnd = ContributionVaultClient::new(&env, &vault)
        .get_round_randomness()
        .unwrap();
    assert_eq!(rnd.phase, LotteryPhase::Revealing);
    assert_eq!(rnd.commit_count, 3);
    assert!(rnd.reveal_deadline > env.ledger().timestamp());
}

#[test]
fn test_commitments_are_stored_by_round_and_member() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    let s = secret(&env, 7);
    let expected = digest(&env, &vault, &members[0], 1, &s);
    commit(&env, &vault, &members[0], &s);

    let stored = ContributionVaultClient::new(&env, &vault)
        .get_commitment(&1u32, &members[0])
        .unwrap();
    assert_eq!(stored, expected);
    assert!(ContributionVaultClient::new(&env, &vault)
        .get_commitment(&1u32, &members[1])
        .is_none());
}

#[test]
#[should_panic(expected = "Member already committed")]
fn test_duplicate_commitment_rejected() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    commit(&env, &vault, &members[0], &secret(&env, 1));
    commit(&env, &vault, &members[0], &secret(&env, 2));
}

#[test]
#[should_panic(expected = "Not a member of this vault")]
fn test_non_member_commitment_rejected() {
    let env = Env::default();
    let (vault, _config, _token, _members) = deploy_active_vault(&env);

    let outsider = Address::generate(&env);
    commit(&env, &vault, &outsider, &secret(&env, 9));
}
