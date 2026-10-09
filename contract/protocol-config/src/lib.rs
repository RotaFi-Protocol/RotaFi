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
impl ProtocolConfig {}
