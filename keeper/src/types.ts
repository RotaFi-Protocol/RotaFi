export enum VaultStateType {
  Setup = 'Setup',
  Active = 'Active',
  Paused = 'Paused',
  Completed = 'Completed',
}

export interface VaultConfig {
  circle_id: number;
  contribution_per_member: string;
  member_cap: number;
  total_rounds: number;
  min_collateral: string;
  round_length_seconds: number;
  grace_period_seconds: number;
}

export interface VaultState {
  config: VaultConfig;
  current_round: number;
  state: VaultStateType;
  member_count: number;
  members_paid_current_round: number;
  round_start_time: number;
  circle_id: number;
  total_rounds: number;
  member_cap: number;
  round_length_seconds: number;
  grace_period_seconds: number;
}

export interface MemberInfo {
  address: string;
  collateral_staked: string;
  has_received_pot: boolean;
  rounds_missed: number;
  is_active: boolean;
}

export interface KeeperConfig {
  pollIntervalMs: number;
  vaultAddress: string;
  rpcUrl: string;
}

export interface KeeperState {
  isRunning: boolean;
  lastPollTime: number;
  roundsProcessed: number;
  defaultsDetected: number;
  payoutsTriggered: number;
  errors: number;
}

export interface RoundLifecycleEvent {
  circleId: number;
  round: number;
  phase: 'started' | 'contributions_open' | 'all_paid' | 'grace_period' | 'payout' | 'slashing' | 'completed';
  timestamp: number;
  details?: Record<string, unknown>;
}
