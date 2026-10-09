#![cfg(test)]

use super::*;
use crate::randomness::{commitment_digest, LotteryPhase};
use soroban_sdk::testutils::{Address as _, Ledger as _};
use soroban_sdk::{token, Address, BytesN, Env, Vec};

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

fn reveal(env: &Env, vault: &Address, member: &Address, secret: &BytesN<32>) {
    env.mock_all_auths();
    ContributionVaultClient::new(env, vault).reveal_randomness(member, secret);
}

#[test]
fn test_reveal_records_secret() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    commit(&env, &vault, &members[0], &secret(&env, 1));
    commit(&env, &vault, &members[1], &secret(&env, 2));
    commit(&env, &vault, &members[2], &secret(&env, 3));

    let s = secret(&env, 1);
    reveal(&env, &vault, &members[0], &s);

    let rnd = ContributionVaultClient::new(&env, &vault)
        .get_round_randomness()
        .unwrap();
    assert_eq!(rnd.phase, LotteryPhase::Revealing);
    assert_eq!(rnd.reveal_count, 1);
    assert_eq!(
        ContributionVaultClient::new(&env, &vault)
            .get_reveal(&1u32, &members[0])
            .unwrap(),
        s
    );
}

#[test]
fn test_all_reveals_reach_ready() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }
    for (i, member) in members.iter().enumerate() {
        reveal(&env, &vault, member, &secret(&env, i as u8 + 1));
    }

    let rnd = ContributionVaultClient::new(&env, &vault)
        .get_round_randomness()
        .unwrap();
    assert_eq!(rnd.phase, LotteryPhase::Ready);
    assert_eq!(rnd.reveal_count, 3);
}

#[test]
#[should_panic(expected = "Reveal does not match commitment")]
fn test_reveal_with_wrong_secret_rejected() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }
    reveal(&env, &vault, &members[0], &secret(&env, 99));
}

#[test]
#[should_panic(expected = "Reveal phase is not open")]
fn test_reveal_before_all_commits_rejected() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    commit(&env, &vault, &members[0], &secret(&env, 1));
    reveal(&env, &vault, &members[0], &secret(&env, 1));
}

#[test]
#[should_panic(expected = "Member already revealed")]
fn test_duplicate_reveal_rejected() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }
    reveal(&env, &vault, &members[0], &secret(&env, 1));
    reveal(&env, &vault, &members[0], &secret(&env, 1));
}

#[test]
#[should_panic(expected = "Member has not committed")]
fn test_reveal_without_commit_rejected() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    let outsider = Address::generate(&env);
    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }
    reveal(&env, &vault, &outsider, &secret(&env, 5));
}

fn commit_and_reveal_all(env: &Env, vault: &Address, members: &[Address; 3]) {
    for (i, member) in members.iter().enumerate() {
        commit(env, vault, member, &secret(env, i as u8 + 1));
    }
    for (i, member) in members.iter().enumerate() {
        reveal(env, vault, member, &secret(env, i as u8 + 1));
    }
}

fn contribute_all(env: &Env, vault: &Address, token_addr: &Address, members: &[Address; 3]) {
    for member in members.iter() {
        env.mock_all_auths();
        ContributionVaultClient::new(env, vault).contribute(member, token_addr);
    }
}

#[test]
fn test_lottery_draw_pays_exactly_one_member() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    commit_and_reveal_all(&env, &vault, &members);
    contribute_all(&env, &vault, &token_addr, &members);

    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);

    let client = ContributionVaultClient::new(&env, &vault);
    let mut paid = 0u32;
    for member in members.iter() {
        if client.get_member(member).unwrap().has_received_pot {
            paid += 1;
        }
    }
    assert_eq!(paid, 1);
    assert_eq!(client.get_vault().current_round, 2);
    assert!(client.get_round_seed(&1u32).is_some());
}

#[test]
fn test_lottery_draw_leaves_only_collateral_in_vault() {
    let env = Env::default();
    let (vault, config, token_addr, members) = deploy_active_vault(&env);

    commit_and_reveal_all(&env, &vault, &members);
    contribute_all(&env, &vault, &token_addr, &members);

    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);

    let expected = config.min_collateral * config.member_cap as i128;
    let balance = token::Client::new(&env, &token_addr).balance(&vault);
    assert_eq!(balance, expected);
}

#[test]
fn test_preview_matches_actual_draw() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    commit_and_reveal_all(&env, &vault, &members);
    let preview = ContributionVaultClient::new(&env, &vault)
        .preview_lottery_winner()
        .unwrap();

    contribute_all(&env, &vault, &token_addr, &members);
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);

    let info = ContributionVaultClient::new(&env, &vault)
        .get_member(&preview)
        .unwrap();
    assert!(info.has_received_pot);
}

#[test]
#[should_panic(expected = "Lottery draw is not ready")]
fn test_draw_requires_ready_phase() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }
    contribute_all(&env, &vault, &token_addr, &members);

    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);
}

#[test]
#[should_panic(expected = "Not all members paid and grace period not expired")]
fn test_draw_requires_contributions() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    commit_and_reveal_all(&env, &vault, &members);

    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);
}

#[test]
fn test_reveal_deadline_allows_partial_reveal_draw() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }
    reveal(&env, &vault, &members[0], &secret(&env, 1));

    let rnd = ContributionVaultClient::new(&env, &vault)
        .get_round_randomness()
        .unwrap();
    env.ledger().set_timestamp(rnd.reveal_deadline + 1);

    contribute_all(&env, &vault, &token_addr, &members);
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);

    let client = ContributionVaultClient::new(&env, &vault);
    let mut paid = 0u32;
    for member in members.iter() {
        if client.get_member(member).unwrap().has_received_pot {
            paid += 1;
        }
    }
    assert_eq!(paid, 1);
}

#[test]
#[should_panic(expected = "Lottery draw is not ready")]
fn test_draw_before_deadline_with_partial_reveals_rejected() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }
    reveal(&env, &vault, &members[0], &secret(&env, 1));
    contribute_all(&env, &vault, &token_addr, &members);

    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);
}

#[test]
fn test_draw_after_deadline_without_any_reveal_succeeds() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    for (i, member) in members.iter().enumerate() {
        commit(&env, &vault, member, &secret(&env, i as u8 + 1));
    }

    let rnd = ContributionVaultClient::new(&env, &vault)
        .get_round_randomness()
        .unwrap();
    env.ledger().set_timestamp(rnd.reveal_deadline + 1);

    contribute_all(&env, &vault, &token_addr, &members);
    env.mock_all_auths();
    ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);

    let client = ContributionVaultClient::new(&env, &vault);
    let mut paid = 0u32;
    for member in members.iter() {
        if client.get_member(member).unwrap().has_received_pot {
            paid += 1;
        }
    }
    assert_eq!(paid, 1);
}

fn remaining_members(env: &Env, vault: &Address, members: &[Address; 3]) -> Vec<Address> {
    let client = ContributionVaultClient::new(env, vault);
    let mut remaining = Vec::new(env);
    for member in members.iter() {
        let info = client.get_member(member).unwrap();
        if !info.has_received_pot {
            remaining.push_back(member.clone());
        }
    }
    remaining
}

#[test]
fn test_full_cycle_every_member_receives_once() {
    let env = Env::default();
    let (vault, _config, token_addr, members) = deploy_active_vault(&env);

    let client = ContributionVaultClient::new(&env, &vault);
    for round in 1..=3u32 {
        let remaining = remaining_members(&env, &vault, &members);
        for (i, member) in remaining.iter().enumerate() {
            commit(&env, &vault, &member, &secret(&env, round as u8 + i as u8));
        }
        for (i, member) in remaining.iter().enumerate() {
            reveal(&env, &vault, &member, &secret(&env, round as u8 + i as u8));
        }
        contribute_all(&env, &vault, &token_addr, &members);
        env.mock_all_auths();
        ContributionVaultClient::new(&env, &vault).release_lottery_payout(&token_addr);
    }

    let vault_state = client.get_vault();
    assert_eq!(vault_state.state, VaultState::Completed);
    for member in members.iter() {
        assert!(client.get_member(member).unwrap().has_received_pot);
    }
}

#[test]
fn test_commitment_is_bound_to_member_and_round() {
    let env = Env::default();
    let (vault, _config, _token, members) = deploy_active_vault(&env);

    let s = secret(&env, 11);
    let m0_r1 = digest(&env, &vault, &members[0], 1, &s);
    let m1_r1 = digest(&env, &vault, &members[1], 1, &s);
    let m0_r2 = digest(&env, &vault, &members[0], 2, &s);

    assert_ne!(m0_r1, m1_r1, "digest must bind to the member");
    assert_ne!(m0_r1, m0_r2, "digest must bind to the round");
}


