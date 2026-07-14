#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol, Vec,
};

const BIDS: Symbol = symbol_short!("bids");
const BID_STATE: Symbol = symbol_short!("b_state");

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub enum BidState {
    Open,
    Closed,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct Bid {
    pub member: Address,
    pub discount_bps: u32,
    pub round: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct AuctionConfig {
    pub circle_id: u32,
    pub member_cap: u32,
    pub max_discount_bps: u32,
}

#[derive(Clone, Debug, PartialEq, Eq)]
#[contracttype]
pub struct BidResult {
    pub winner: Address,
    pub winning_discount_bps: u32,
    pub discount_per_member: u32,
}

/// BidEngine handles sealed-bid auction logic for auction-style circles.
///
/// Members bid a discount (in basis points) to receive the pot early.
/// The winning discount is redistributed pro-rata to the other members
/// as bonus interest on their contributions.
#[contract]
pub struct BidEngine;

#[contractimpl]
impl BidEngine {
    /// Initializes a new auction round for a given circle.
    pub fn start_auction(env: Env, config: AuctionConfig, round: u32) {
        assert!(
            !env.storage().instance().has(&BID_STATE),
            "Auction already in progress"
        );

        env.storage().instance().set(&BID_STATE, &BidState::Open);
        env.storage().persistent().set(&(symbol_short!("config"),), &config);

        env.events()
            .publish((symbol_short!("auct_strt"),), (config.circle_id, round));
    }

    /// Submit a sealed bid for the current auction round.
    ///
    /// # Arguments
    /// * `member` - The bidding member address.
    /// * `discount_bps` - Discount in basis points (e.g. 500 = 5%).
    ///
    /// # Panics
    /// Panics if discount exceeds max, auction is not open, or member bids twice.
    pub fn submit_bid(env: Env, member: Address, discount_bps: u32, round: u32) {
        member.require_auth();

        let state: BidState = env
            .storage()
            .instance()
            .get(&BID_STATE)
            .unwrap_or(BidState::Closed);
        assert!(state == BidState::Open, "Auction is not open");

        let config: AuctionConfig = env
            .storage()
            .persistent()
            .get(&(symbol_short!("config"),))
            .unwrap();
        assert!(
            discount_bps <= config.max_discount_bps,
            "Discount exceeds maximum allowed"
        );

        let mut bids: Map<Address, Bid> =
            env.storage().persistent().get(&BIDS).unwrap_or(Map::new(&env));

        assert!(
            !bids.contains_key(member.clone()),
            "Member already submitted a bid for this round"
        );

        let bid = Bid {
            member: member.clone(),
            discount_bps,
            round,
        };

        bids.set(member.clone(), bid);
        env.storage().persistent().set(&BIDS, &bids);

        env.events()
            .publish((symbol_short!("bid_sub"),), (member, discount_bps, round));
    }

    /// Resolves the auction by selecting the highest discount bid as winner.
    ///
    /// Returns the auction result with winner and redistributed discount.
    ///
    /// # Panics
    /// Panics if auction is not open or no bids have been placed.
    pub fn resolve_auction(env: Env, member_cap: u32) -> BidResult {
        let state: BidState = env
            .storage()
            .instance()
            .get(&BID_STATE)
            .unwrap_or(BidState::Closed);
        assert!(state == BidState::Open, "Auction is not open");

        let bids: Map<Address, Bid> =
            env.storage().persistent().get(&BIDS).unwrap_or(Map::new(&env));

        assert!(bids.len() > 0, "No bids placed");

        let mut winner: Option<Address> = None;
        let mut highest_discount: u32 = 0;

        for (_addr, bid) in bids.iter() {
            if bid.discount_bps > highest_discount {
                highest_discount = bid.discount_bps;
                winner = Some(bid.member.clone());
            }
        }

        let winner = winner.unwrap();

        let num_other_members = member_cap.saturating_sub(1).max(1);
        let discount_per_member = highest_discount / num_other_members;

        let result = BidResult {
            winner: winner.clone(),
            winning_discount_bps: highest_discount,
            discount_per_member,
        };

        env.storage().instance().set(&BID_STATE, &BidState::Closed);
        env.storage().persistent().remove(&BIDS);

        env.events().publish(
            (symbol_short!("auct_res"),),
            (winner, highest_discount, discount_per_member),
        );

        result
    }

    /// Returns the current auction state (Open or Closed).
    pub fn get_state(env: Env) -> BidState {
        env.storage()
            .instance()
            .get(&BID_STATE)
            .unwrap_or(BidState::Closed)
    }

    /// Returns the bid for a specific member.
    pub fn get_bid(env: Env, member: Address) -> Option<Bid> {
        let bids: Map<Address, Bid> =
            env.storage().persistent().get(&BIDS).unwrap_or(Map::new(&env));
        bids.get(member)
    }

    /// Returns all bids in the current auction.
    pub fn get_all_bids(env: Env) -> Vec<Bid> {
        let bids: Map<Address, Bid> =
            env.storage().persistent().get(&BIDS).unwrap_or(Map::new(&env));
        let mut result: Vec<Bid> = Vec::new(&env);
        for (_addr, bid) in bids.iter() {
            result.push_back(bid);
        }
        result
    }
}

#[cfg(test)]
mod test;
