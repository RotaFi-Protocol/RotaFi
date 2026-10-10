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

export type AnchorTransferDirection = 'deposit' | 'withdraw';

export interface AnchorAssetLimits {
  enabled: boolean;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
}

export interface AnchorAsset {
  code: string;
  deposit: AnchorAssetLimits;
  withdraw: AnchorAssetLimits;
}

export interface AnchorInfo {
  home_domain: string;
  transfer_server: string;
  network_passphrase: string;
  web_auth_endpoint: string | null;
  auth_required: boolean;
  default_asset: string;
  assets: AnchorAsset[];
}

export interface AnchorTransfer {
  id: string;
  url: string;
  token?: string;
  asset_code: string;
  account: string;
  status: string;
}

export interface AnchorTransaction {
  id: string;
  status: string;
  terminal?: boolean;
  succeeded?: boolean;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  asset_code?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  message?: string;
  more_info_url?: string;
  started_at?: string;
  completed_at?: string;
}

export type AnchorTransferState =
  | 'idle'
  | 'authenticating'
  | 'starting'
  | 'awaiting_user'
  | 'pending'
  | 'completed'
  | 'failed';

export interface AnchorTransferRecord {
  id: string;
  direction: AnchorTransferDirection;
  assetCode: string;
  amount?: string;
  account: string;
  status: string;
  url: string;
  createdAt: number;
  updatedAt: number;
}
