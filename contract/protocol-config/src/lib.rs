#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec,
};

const CONFIG: Symbol = symbol_short!("config");
const OWNERS: Symbol = symbol_short!("owners");
const THRESHOLD: Symbol = symbol_short!("thresh");

/// Basis-point denominator (100%).
pub const BPS_DENOMINATOR: u32 = 10_000;
/// Maximum protocol fee, in basis points (10%).
pub const MAX_FEE_BPS: u32 = 1_000;
/// Maximum slash percentage, in basis points (100%).
pub const MAX_SLASH_BPS: u32 = BPS_DENOMINATOR;
/// Minimum allowed value for a circle member cap.
pub const MIN_MEMBER_CAP_FLOOR: u32 = 2;

/// The protocol-wide parameters governed by the multisig.
///
/// These bounds and rates are consumed by the circle factory, contribution
/// vault, and keeper so that individual circles cannot step outside the
/// protocol's risk envelope.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct ProtocolParams {
    /// Minimum members a circle may configure.
    pub min_member_cap: u32,
    /// Maximum members a circle may configure.
    pub max_member_cap: u32,
    /// Minimum collateral (in stroops of the circle token) a circle may require.
    pub min_collateral: i128,
    /// Maximum collateral a circle may require.
    pub max_collateral: i128,
    /// Protocol fee charged on payouts, in basis points.
    pub fee_bps: u32,
    /// Default collateral slash, in basis points.
    pub slash_bps: u32,
}

/// Multisig membership and signing threshold used to authorize changes.
#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct MultisigConfig {
    pub owners: Vec<Address>,
    pub threshold: u32,
}

/// ProtocolConfig holds the protocol-wide, multisig-controlled parameters
/// for RotaFi and exposes them to the other contracts.
#[contract]
pub struct ProtocolConfig;

#[contractimpl]
impl ProtocolConfig {
    /// Initializes the configuration with the protocol's initial multisig
    /// owner set and starting parameters.
    ///
    /// # Panics
    /// Panics if already initialized, if no owners are supplied, or if the
    /// threshold is zero or greater than the number of owners.
    pub fn initialize(env: Env, owners: Vec<Address>, threshold: u32, params: ProtocolParams) {
        assert!(
            !env.storage().instance().has(&CONFIG),
            "Protocol config already initialized"
        );
        assert!(owners.len() > 0, "At least one owner required");
        assert!(threshold > 0, "Threshold must be positive");
        assert!(
            threshold <= owners.len(),
            "Threshold cannot exceed owner count"
        );
        params.require_valid();

        env.storage().instance().set(&CONFIG, &params);
        env.storage().instance().set(&OWNERS, &owners);
        env.storage().instance().set(&THRESHOLD, &threshold);

        env.events()
            .publish((symbol_short!("cfg_init"),), (threshold, owners));
    }

    /// Returns the active multisig owners.
    pub fn get_owners(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get(&OWNERS)
            .unwrap_or(Vec::new(&env))
    }

    /// Returns the number of owner approvals required to make a change.
    pub fn get_threshold(env: Env) -> u32 {
        env.storage().instance().get(&THRESHOLD).unwrap_or(0)
    }

    /// Returns true if `who` is currently a multisig owner.
    pub fn is_owner(env: Env, who: Address) -> bool {
        let owners: Vec<Address> = env
            .storage()
            .instance()
            .get(&OWNERS)
            .unwrap_or(Vec::new(&env));
        owner_exists(&owners, &who)
    }

    /// Returns the full protocol parameter set.
    pub fn get_params(env: Env) -> ProtocolParams {
        env.storage().instance().get(&CONFIG).unwrap()
    }

    /// Returns the protocol fee in basis points.
    pub fn get_fee_bps(env: Env) -> u32 {
        let params: ProtocolParams = env.storage().instance().get(&CONFIG).unwrap();
        params.fee_bps
    }

    /// Returns the default collateral slash in basis points.
    pub fn get_slash_bps(env: Env) -> u32 {
        let params: ProtocolParams = env.storage().instance().get(&CONFIG).unwrap();
        params.slash_bps
    }

    /// Returns true when `member_cap` falls inside the protocol bounds.
    pub fn check_member_cap(env: Env, member_cap: u32) -> bool {
        let params: ProtocolParams = env.storage().instance().get(&CONFIG).unwrap();
        member_cap >= params.min_member_cap && member_cap <= params.max_member_cap
    }

    /// Returns true when `collateral` falls inside the protocol bounds.
    pub fn check_collateral(env: Env, collateral: i128) -> bool {
        let params: ProtocolParams = env.storage().instance().get(&CONFIG).unwrap();
        collateral >= params.min_collateral && collateral <= params.max_collateral
    }

    /// Replaces the full parameter set. Requires multisig approval.
    ///
    /// # Panics
    /// Panics if approvals are insufficient or the new params are invalid.
    #[allow(deprecated)]
    pub fn update_params(env: Env, approvers: Vec<Address>, new_params: ProtocolParams) {
        require_multisig(&env, &approvers);
        new_params.require_valid();

        env.storage().instance().set(&CONFIG, &new_params);

        env.events()
            .publish((symbol_short!("cfg_upd"),), (approvers, new_params));
    }

    /// Updates the protocol fee (basis points). Requires multisig approval.
    #[allow(deprecated)]
    pub fn set_fee_bps(env: Env, approvers: Vec<Address>, fee_bps: u32) {
        require_multisig(&env, &approvers);

        let mut params = load_params(&env);
        params.fee_bps = fee_bps;
        params.require_valid();
        store_params(&env, &params);

        env.events()
            .publish((symbol_short!("fee_set"),), (approvers, fee_bps));
    }

    /// Updates the default collateral slash (basis points). Requires multisig
    /// approval.
    #[allow(deprecated)]
    pub fn set_slash_bps(env: Env, approvers: Vec<Address>, slash_bps: u32) {
        require_multisig(&env, &approvers);

        let mut params = load_params(&env);
        params.slash_bps = slash_bps;
        params.require_valid();
        store_params(&env, &params);

        env.events()
            .publish((symbol_short!("slsh_set"),), (approvers, slash_bps));
    }

    /// Updates the allowed member-cap bounds. Requires multisig approval.
    #[allow(deprecated)]
    pub fn set_member_cap_bounds(
        env: Env,
        approvers: Vec<Address>,
        min_member_cap: u32,
        max_member_cap: u32,
    ) {
        require_multisig(&env, &approvers);

        let mut params = load_params(&env);
        params.min_member_cap = min_member_cap;
        params.max_member_cap = max_member_cap;
        params.require_valid();
        store_params(&env, &params);

        env.events().publish(
            (symbol_short!("cap_set"),),
            (approvers, min_member_cap, max_member_cap),
        );
    }

    /// Updates the allowed collateral bounds. Requires multisig approval.
    #[allow(deprecated)]
    pub fn set_collateral_bounds(
        env: Env,
        approvers: Vec<Address>,
        min_collateral: i128,
        max_collateral: i128,
    ) {
        require_multisig(&env, &approvers);

        let mut params = load_params(&env);
        params.min_collateral = min_collateral;
        params.max_collateral = max_collateral;
        params.require_valid();
        store_params(&env, &params);

        env.events().publish(
            (symbol_short!("col_set"),),
            (approvers, min_collateral, max_collateral),
        );
    }
}

impl ProtocolParams {
    /// Validates that the parameter set is internally consistent and within
    /// the protocol's hard-coded safety limits.
    pub fn require_valid(&self) {
        assert!(
            self.min_member_cap >= MIN_MEMBER_CAP_FLOOR,
            "min_member_cap below floor"
        );
        assert!(
            self.max_member_cap >= self.min_member_cap,
            "max_member_cap below min_member_cap"
        );
        assert!(
            self.min_collateral >= 0,
            "min_collateral cannot be negative"
        );
        assert!(
            self.max_collateral >= self.min_collateral,
            "max_collateral below min_collateral"
        );
        assert!(self.fee_bps <= MAX_FEE_BPS, "fee_bps exceeds maximum");
        assert!(
            self.slash_bps <= MAX_SLASH_BPS,
            "slash_bps exceeds maximum"
        );
    }
}

/// Loads the current parameter set.
fn load_params(env: &Env) -> ProtocolParams {
    env.storage().instance().get(&CONFIG).unwrap()
}

/// Persists an updated parameter set.
fn store_params(env: &Env, params: &ProtocolParams) {
    env.storage().instance().set(&CONFIG, params);
}

/// Returns true when `who` appears in `owners`.
fn owner_exists(owners: &Vec<Address>, who: &Address) -> bool {
    for owner in owners.iter() {
        if owner == *who {
            return true;
        }
    }
    false
}

/// Verifies that `approvers` contains at least `threshold` distinct owners,
/// requiring authorization from each of them.
///
/// # Panics
/// Panics if the protocol is uninitialized, any approver is not an owner, or
/// fewer than `threshold` distinct owners approved.
fn require_multisig(env: &Env, approvers: &Vec<Address>) {
    let owners: Vec<Address> = env
        .storage()
        .instance()
        .get(&OWNERS)
        .unwrap_or(Vec::new(env));
    let threshold: u32 = env.storage().instance().get(&THRESHOLD).unwrap_or(0);
    assert!(threshold > 0, "Protocol config not initialized");

    let mut approvals = 0u32;
    let mut i = 0u32;
    while i < approvers.len() {
        let approver = approvers.get(i).unwrap();
        assert!(owner_exists(&owners, &approver), "Approver is not an owner");
        approver.require_auth();

        let mut duplicate = false;
        let mut j = 0u32;
        while j < i {
            if approvers.get(j).unwrap() == approver {
                duplicate = true;
                break;
            }
            j += 1;
        }
        if !duplicate {
            approvals += 1;
        }
        i += 1;
    }

    assert!(approvals >= threshold, "Insufficient multisig approvals");
}
