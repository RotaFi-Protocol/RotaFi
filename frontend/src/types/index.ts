export interface Circle {
  id: number;
  organizer: string;
  member_cap: number;
  payout_method: number;
  contribution_amount: string;
  active: boolean;
  created_at?: number;
  token_address?: string;
  token_symbol?: string;
}

export interface Asset {
  symbol: string;
  name: string;
  address: string;
  /** SEP-41 token decimals from the Stellar asset contract. */
  decimals: number;
}

export interface VaultState {
  config: {
    circle_id: number;
    contribution_per_member: string;
    member_cap: number;
    total_rounds: number;
    min_collateral: string;
    token_address?: string;
    token_symbol?: string;
  };
  current_round: number;
  state: 'Setup' | 'Active' | 'Paused' | 'Completed';
  member_count: number;
  members_paid_current_round: number;
}

export interface MemberInfo {
  address: string;
  collateral_staked: string;
  has_received_pot: boolean;
  rounds_missed: number;
  is_active: boolean;
}

export interface ReputationScore {
  address: string;
  circles_joined: number;
  circles_completed: number;
  defaults: number;
  total_slashed: string;
  last_updated: number;
}

export interface Bid {
  member: string;
  discount_bps: number;
  round: number;
}

export type WalletProvider = 'freighter' | 'xbull' | 'rabet' | null;

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  provider: WalletProvider;
}

export type CircleLifecycleState = 'Setup' | 'Active' | 'Completed';

export interface RoundRecord {
  round: number;
  winner: string;
  payout_amount: string;
  completed_at: number;
}

export interface CircleLifecycle {
  circleId: number;
  tokenSymbol: string;
  contributionAmount: string;
  memberCap: number;
  totalRounds: number;
  currentRound: number;
  membersPaidCurrentRound: number;
  state: CircleLifecycleState;
  joined: boolean;
  hasReceivedPot: boolean;
  history: RoundRecord[];
}

export interface LifecycleMember {
  address: string;
  has_received_pot: boolean;
  rounds_contributed: number;
}
