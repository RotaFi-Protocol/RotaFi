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
