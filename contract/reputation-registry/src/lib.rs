#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol,
};

const REPUTATION: Symbol = symbol_short!("rep");

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct ReputationScore {
    pub address: Address,
    pub circles_joined: u32,
    pub circles_completed: u32,
    pub defaults: u32,
    pub total_slashed: i128,
    pub last_updated: u64,
}

/// ReputationRegistry maintains a cross-circle, portable on-chain reputation score.
///
/// Other contracts write defaults and completions here so that serial defaulters
/// carry a bad score across all circles.
#[contract]
pub struct ReputationRegistry;

#[contractimpl]
impl ReputationRegistry {
    /// Records a successful circle completion for a member.
    pub fn record_completion(env: Env, member: Address, circle_id: u32) {
        let mut scores: Map<Address, ReputationScore> = env
            .storage()
            .persistent()
            .get(&REPUTATION)
            .unwrap_or(Map::new(&env));

        let mut score = scores
            .get(member.clone())
            .unwrap_or(ReputationScore {
                address: member.clone(),
                circles_joined: 0,
                circles_completed: 0,
                defaults: 0,
                total_slashed: 0,
                last_updated: 0,
            });

        score.circles_completed += 1;
        score.last_updated = env.ledger().timestamp();

        scores.set(member.clone(), score);
        env.storage().persistent().set(&REPUTATION, &scores);

        env.events()
            .publish((symbol_short!("compl"),), (member, circle_id));
    }

    /// Records a default for a member, including the amount slashed.
    pub fn record_default(env: Env, member: Address, circle_id: u32, slashed_amount: i128) {
        let mut scores: Map<Address, ReputationScore> = env
            .storage()
            .persistent()
            .get(&REPUTATION)
            .unwrap_or(Map::new(&env));

        let mut score = scores
            .get(member.clone())
            .unwrap_or(ReputationScore {
                address: member.clone(),
                circles_joined: 0,
                circles_completed: 0,
                defaults: 0,
                total_slashed: 0,
                last_updated: 0,
            });

        score.defaults += 1;
        score.total_slashed += slashed_amount;
        score.last_updated = env.ledger().timestamp();

        scores.set(member.clone(), score);
        env.storage().persistent().set(&REPUTATION, &scores);

        env.events()
            .publish((symbol_short!("default"),), (member, circle_id, slashed_amount));
    }

    /// Records that a member has joined a new circle.
    pub fn record_join(env: Env, member: Address) {
        let mut scores: Map<Address, ReputationScore> = env
            .storage()
            .persistent()
            .get(&REPUTATION)
            .unwrap_or(Map::new(&env));

        let mut score = scores
            .get(member.clone())
            .unwrap_or(ReputationScore {
                address: member.clone(),
                circles_joined: 0,
                circles_completed: 0,
                defaults: 0,
                total_slashed: 0,
                last_updated: 0,
            });

        score.circles_joined += 1;
        score.last_updated = env.ledger().timestamp();

        scores.set(member.clone(), score);
        env.storage().persistent().set(&REPUTATION, &scores);

        env.events()
            .publish((symbol_short!("joined"),), (member,));
    }

    /// Returns the reputation score for a given member address.
    /// Returns None if the member has never been recorded.
    pub fn get_score(env: Env, member: Address) -> Option<ReputationScore> {
        let scores: Map<Address, ReputationScore> = env
            .storage()
            .persistent()
            .get(&REPUTATION)
            .unwrap_or(Map::new(&env));
        scores.get(member)
    }

    /// Returns a reputation rating (0-100) based on completion/default ratio.
    /// Higher is better. New members start at 100.
    pub fn get_rating(env: Env, member: Address) -> u32 {
        let scores: Map<Address, ReputationScore> = env
            .storage()
            .persistent()
            .get(&REPUTATION)
            .unwrap_or(Map::new(&env));

        let score = scores.get(member);

        if score.is_none() {
            return 100;
        }

        let score = score.unwrap();

        if score.circles_joined == 0 {
            return 100;
        }

        let total = score.circles_completed + score.defaults;
        if total == 0 {
            return 100;
        }

        let rating = (score.circles_completed as u64 * 100) / total as u64;
        (rating as u32).min(100)
    }
}

#[cfg(test)]
mod test;
