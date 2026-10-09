#![no_std]

use soroban_sdk::{contract, contractimpl, Env};

/// ProtocolConfig holds the protocol-wide, multisig-controlled parameters
/// for RotaFi and exposes them to the other contracts.
#[contract]
pub struct ProtocolConfig;

#[contractimpl]
impl ProtocolConfig {}
