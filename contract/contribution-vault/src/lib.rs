#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Map, Symbol,
};

const VAULT: Symbol = symbol_short!("vault");
const MEMBERS: Symbol = symbol_short!("members");
const ROUND_PAYMENTS: Symbol = symbol_short!("rd_pay");
const ROUND_WINNER: Symbol = symbol_short!("rd_win");
const COLLATERAL: Symbol = symbol_short!("collat");

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum VaultState {
    Setup,
    Active,
    Paused,
    Completed,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct VaultConfig {
    pub circle_id: u32,
    pub token_address: Address,
    pub contribution_per_member: i128,
    pub member_cap: u32,
    pub total_rounds: u32,
    pub min_collateral: i128,
    pub round_length_seconds: u64,
    pub grace_period_seconds: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct Vault {
    pub config: VaultConfig,
    pub current_round: u32,
    pub state: VaultState,
    pub member_count: u32,
    pub members_paid_current_round: u32,
    pub round_start_time: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct MemberInfo {
    pub address: Address,
    pub collateral_staked: i128,
    pub has_received_pot: bool,
    pub rounds_missed: u32,
    pub joined_at_round: u32,
    pub is_active: bool,
}

/// ContributionVault manages per-circle escrow, contributions, and payouts.
///
/// Members join by staking collateral, contribute each round, and one member
/// receives the pot each round. Handles defaults with collateral slashing.
#[contract]
pub struct ContributionVault;

#[contractimpl]
impl ContributionVault {
    /// Initializes a new vault for a given circle configuration.
    ///
    /// # Arguments
    /// * `env` - Soroban environment.
    /// * `config` - Vault configuration matching the circle.
    ///
    /// # Panics
    /// Panics if total_rounds is 0, member_cap is < 2, or contribution is <= 0.
    pub fn initialize(env: Env, config: VaultConfig) {
        config.require_valid();

        assert!(
            !env.storage().instance().has(&VAULT),
            "Vault already initialized"
        );

        let vault = Vault {
            config: config.clone(),
            current_round: 0,
            state: VaultState::Setup,
            member_count: 0,
            members_paid_current_round: 0,
            round_start_time: 0,
        };

        env.storage().instance().set(&VAULT, &vault);
        env.events()
            .publish((symbol_short!("v_init"),), (config.circle_id,));
    }

    /// Allows a member to join the circle by staking collateral.
    ///
    /// The member transfers `min_collateral` USDC from their account to this vault.
    /// Collateral is held as a security deposit against defaults.
    ///
    /// # Panics
    /// Panics if the vault is not in Setup state, member cap is reached,
    /// or the member has already joined.
    pub fn join_vault(env: Env, member: Address, usdc_token: Address) {
        member.require_auth();
        let mut vault: Vault = env.storage().instance().get(&VAULT).unwrap();

        assert!(vault.state == VaultState::Setup, "Vault is not accepting members");
        assert!(
            vault.member_count < vault.config.member_cap,
            "Member cap reached"
        );

        let mut members: Map<Address, MemberInfo> = env
            .storage()
            .persistent()
            .get(&MEMBERS)
            .unwrap_or(Map::new(&env));

        assert!(!members.contains_key(member.clone()), "Member already joined");

        let collateral_amount = vault.config.min_collateral;

        // Transfer collateral from member to vault
        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &collateral_amount,
        );

        let member_info = MemberInfo {
            address: member.clone(),
            collateral_staked: collateral_amount,
            has_received_pot: false,
            rounds_missed: 0,
            joined_at_round: 0,
            is_active: true,
        };

        members.set(member.clone(), member_info);
        vault.member_count += 1;

        if vault.member_count == vault.config.member_cap {
            vault.state = VaultState::Active;
            vault.current_round = 1;
            vault.round_start_time = env.ledger().timestamp();
        }

        env.storage().persistent().set(&MEMBERS, &members);
        env.storage().instance().set(&VAULT, &vault);

        env.events().publish(
            (symbol_short!("mem_join"),),
            (member, vault.config.circle_id),
        );
    }

    /// Submit a contribution for the current round from a member.
    ///
    /// # Panics
    /// Panics if vault is not active, member is not joined, member already
    /// paid this round, or contribution amount is incorrect.
    pub fn contribute(env: Env, member: Address, usdc_token: Address) {
        member.require_auth();
        let mut vault: Vault = env.storage().instance().get(&VAULT).unwrap();
        assert!(vault.state == VaultState::Active, "Vault is not active");

        let members: Map<Address, MemberInfo> = env
            .storage()
            .persistent()
            .get(&MEMBERS)
            .unwrap_or(Map::new(&env));

        let member_info = members.get(member.clone()).unwrap_or_else(|| {
            panic!("Not a member of this vault");
        });

        assert!(member_info.is_active, "Member is not active");

        let round_key = (vault.current_round, member.clone());
        let mut round_payments: Map<(u32, Address), bool> = env
            .storage()
            .persistent()
            .get(&ROUND_PAYMENTS)
            .unwrap_or(Map::new(&env));

        assert!(
            !round_payments.get(round_key.clone()).unwrap_or(false),
            "Already contributed this round"
        );

        let amount = vault.config.contribution_per_member;

        // Transfer contribution from member to vault
        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(
            &member,
            &env.current_contract_address(),
            &amount,
        );

        round_payments.set(round_key, true);
        vault.members_paid_current_round += 1;

        env.storage().persistent().set(&ROUND_PAYMENTS, &round_payments);
        env.storage().instance().set(&VAULT, &vault);

        env.events().publish(
            (symbol_short!("contrib"),),
            (vault.current_round, member, amount),
        );
    }

    /// Returns whether all active members have paid for the current round.
    pub fn all_paid(env: Env) -> bool {
        let vault: Vault = env.storage().instance().get(&VAULT).unwrap();
        let active_count = self_active_member_count(&env);
        vault.members_paid_current_round >= active_count
    }

    /// Releases the pot to the specified winner for the current round.
    /// Can only be called when all members have paid or grace period has expired.
    ///
    /// # Panics
    /// Panics if all members haven't paid, or if the winner is invalid.
    pub fn release_payout(env: Env, winner: Address, usdc_token: Address) {
        let mut vault: Vault = env.storage().instance().get(&VAULT).unwrap();
        assert!(vault.state == VaultState::Active, "Vault is not active");

        let active_count = self_active_member_count(&env);
        let all_paid = vault.members_paid_current_round >= active_count;

        let now = env.ledger().timestamp();
        let grace_ended = now
            >= vault.round_start_time
                + vault.config.round_length_seconds
                + vault.config.grace_period_seconds;

        assert!(
            all_paid || grace_ended,
            "Not all members paid and grace period not expired"
        );

        let mut members: Map<Address, MemberInfo> = env
            .storage()
            .persistent()
            .get(&MEMBERS)
            .unwrap();

        let mut winner_info = members.get(winner.clone()).unwrap_or_else(|| {
            panic!("Winner is not a member");
        });
        assert!(!winner_info.has_received_pot, "Winner already received pot");

        let pot = vault.config.contribution_per_member
            * (vault.member_count as i128);

        let token_client = token::Client::new(&env, &usdc_token);
        token_client.transfer(
            &env.current_contract_address(),
            &winner,
            &pot,
        );

        winner_info.has_received_pot = true;
        members.set(winner.clone(), winner_info);

        let mut round_winners: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&ROUND_WINNER)
            .unwrap_or(Map::new(&env));
        round_winners.set(vault.current_round, winner.clone());
        env.storage().persistent().set(&ROUND_WINNER, &round_winners);

        // Move to next round
        vault.current_round += 1;
        vault.members_paid_current_round = 0;
        vault.round_start_time = now;

        if vault.current_round > vault.config.total_rounds {
            vault.state = VaultState::Completed;
        }

        env.storage().persistent().set(&MEMBERS, &members);
        env.storage().instance().set(&VAULT, &vault);

        env.events().publish(
            (symbol_short!("payout"),),
            (vault.current_round - 1, winner, pot),
        );
    }

    /// Slashes a member's collateral for missing a contribution.
    ///
    /// Returns the slashed amount. Can only be called after grace period expires
    /// and the member hasn't paid for the current round.
    pub fn slash_default(env: Env, defaulter: Address, slash_percent: u32) -> i128 {
        let vault: Vault = env.storage().instance().get(&VAULT).unwrap();

        let now = env.ledger().timestamp();
        let grace_ended = now
            >= vault.round_start_time
                + vault.config.round_length_seconds
                + vault.config.grace_period_seconds;

        assert!(grace_ended, "Grace period not yet expired");

        let round_key = (vault.current_round, defaulter.clone());
        let round_payments: Map<(u32, Address), bool> = env
            .storage()
            .persistent()
            .get(&ROUND_PAYMENTS)
            .unwrap_or(Map::new(&env));

        assert!(
            !round_payments.get(round_key.clone()).unwrap_or(false),
            "Member has already paid this round"
        );

        let mut members: Map<Address, MemberInfo> = env
            .storage()
            .persistent()
            .get(&MEMBERS)
            .unwrap();
        let mut member_info = members.get(defaulter.clone()).unwrap_or_else(|| {
            panic!("Not a member");
        });

        let slash_amount = (member_info.collateral_staked * slash_percent as i128) / 100;
        member_info.collateral_staked -= slash_amount;
        member_info.rounds_missed += 1;

        members.set(defaulter.clone(), member_info);
        env.storage().persistent().set(&MEMBERS, &members);

        env.events().publish(
            (symbol_short!("slash"),),
            (defaulter, vault.current_round, slash_amount),
        );

        slash_amount
    }

    /// Returns vault metadata.
    pub fn get_vault(env: Env) -> Vault {
        env.storage().instance().get(&VAULT).unwrap()
    }

    /// Returns member info for a given member address.
    pub fn get_member(env: Env, member: Address) -> Option<MemberInfo> {
        let members: Map<Address, MemberInfo> = env
            .storage()
            .persistent()
            .get(&MEMBERS)
            .unwrap_or(Map::new(&env));
        members.get(member)
    }

    /// Returns whether a member paid for a given round.
    pub fn has_paid(env: Env, round: u32, member: Address) -> bool {
        let round_payments: Map<(u32, Address), bool> = env
            .storage()
            .persistent()
            .get(&ROUND_PAYMENTS)
            .unwrap_or(Map::new(&env));
        round_payments.get((round, member)).unwrap_or(false)
    }
}

impl VaultConfig {
    fn require_valid(&self) {
        assert!(self.member_cap >= 2, "Vault must have at least 2 members");
        assert!(self.contribution_per_member > 0, "Contribution amount must be positive");
        assert!(self.total_rounds > 0, "Total rounds must be positive");
        assert!(self.min_collateral >= 0, "Collateral cannot be negative");
    }
}

fn self_active_member_count(env: &Env) -> u32 {
    let members: Map<Address, MemberInfo> = env
        .storage()
        .persistent()
        .get(&MEMBERS)
        .unwrap_or(Map::new(env));
    let mut count = 0u32;
    for (_addr, info) in members.iter() {
        if info.is_active {
            count += 1;
        }
    }
    count
}

#[cfg(test)]
mod test;
