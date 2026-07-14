#![no_std]
use soroban_sdk::{contract, contractimpl, Env};

#[contract]
pub struct ContributionVault;

#[contractimpl]
impl ContributionVault {
    pub fn placeholder(_env: Env) -> u32 {
        0
    }
}
