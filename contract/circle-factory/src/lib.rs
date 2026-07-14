#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol,
};

const CIRCLE_COUNT: Symbol = symbol_short!("c_count");
const CIRCLES: Symbol = symbol_short!("circles");

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum PayoutMethod {
    Lottery = 0,
    SealedBidAuction = 1,
    PriorityBased = 2,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct CircleConfig {
    pub contribution_amount: i128,
    pub round_length_seconds: u64,
    pub member_cap: u32,
    pub payout_method: PayoutMethod,
    pub min_collateral: i128,
    pub grace_period_seconds: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct Circle {
    pub id: u32,
    pub organizer: Address,
    pub config: CircleConfig,
    pub created_at: u64,
    pub active: bool,
}

/// CircleFactory creates and manages ROSCA circle instances.
///
/// It maintains a registry of all circles created through the protocol,
/// enforces creation constraints, and emits events for downstream consumers.
#[contract]
pub struct CircleFactory;

#[contractimpl]
impl CircleFactory {
    /// Creates a new circle with the given configuration.
    ///
    /// # Arguments
    /// * `env` - The Soroban environment.
    /// * `config` - Circle configuration parameters.
    ///
    /// # Returns
    /// The ID of the newly created circle.
    ///
    /// # Panics
    /// Panics if `member_cap` is 0 or 1, or if `contribution_amount` is <= 0.
    #[allow(deprecated)]
    pub fn create_circle(env: Env, config: CircleConfig) -> u32 {
        config.require_valid();

        let mut count: u32 = env.storage().instance().get(&CIRCLE_COUNT).unwrap_or(0);
        count += 1;
        let circle_id = count;

        let organizer = env.current_contract_address();

        let circle = Circle {
            id: circle_id,
            organizer: organizer.clone(),
            config: config.clone(),
            created_at: env.ledger().timestamp(),
            active: false,
        };

        let mut circles: Map<u32, Circle> = env.storage().persistent().get(&CIRCLES).unwrap_or(Map::new(&env));
        circles.set(circle_id, circle);
        env.storage().persistent().set(&CIRCLES, &circles);
        env.storage().instance().set(&CIRCLE_COUNT, &count);

        env.events().publish((symbol_short!("circle_cr"),), (circle_id, organizer, config));

        circle_id
    }

    /// Returns the stored circle by ID, if it exists.
    pub fn get_circle(env: Env, circle_id: u32) -> Option<Circle> {
        let circles: Map<u32, Circle> = env.storage().persistent().get(&CIRCLES).unwrap_or(Map::new(&env));
        circles.get(circle_id)
    }

    /// Returns the total number of circles created (including inactive).
    pub fn circle_count(env: Env) -> u32 {
        env.storage().instance().get(&CIRCLE_COUNT).unwrap_or(0)
    }

    /// Activates a circle (called by the contribution vault once setup is complete).
    pub fn activate_circle(env: Env, circle_id: u32) {
        let mut circles: Map<u32, Circle> = env.storage().persistent().get(&CIRCLES).unwrap_or(Map::new(&env));
        if let Some(mut circle) = circles.get(circle_id) {
            circle.active = true;
            circles.set(circle_id, circle);
            env.storage().persistent().set(&CIRCLES, &circles);
        }
    }
}

impl CircleConfig {
    fn require_valid(&self) {
        assert!(self.member_cap >= 2, "Circle must have at least 2 members");
        assert!(self.contribution_amount > 0, "Contribution amount must be positive");
        assert!(self.round_length_seconds > 0, "Round length must be positive");
        assert!(self.min_collateral >= 0, "Collateral cannot be negative");
    }
}

#[cfg(test)]
mod test;
