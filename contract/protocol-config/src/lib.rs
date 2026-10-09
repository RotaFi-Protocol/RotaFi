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

/// Returns true when `who` appears in `owners`.
fn owner_exists(owners: &Vec<Address>, who: &Address) -> bool {
    for owner in owners.iter() {
        if owner == *who {
            return true;
        }
    }
    false
}
