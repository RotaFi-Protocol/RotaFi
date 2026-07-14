import { config } from '../config';

// In-memory storage for API state (cache for contract reads)
const memberCache = new Map<string, any>();
const circleCache = new Map<number, any>();
const bidCache = new Map<string, any>();

export async function getCircleCount(): Promise<number> {
  return circleCache.size;
}

export async function getCircle(id: number): Promise<any> {
  return circleCache.get(id) || null;
}

export async function getVaultState(): Promise<any> {
  return {
    config: {
      circle_id: 1,
      contribution_per_member: '100000000',
      member_cap: 5,
      total_rounds: 5,
      min_collateral: '50000000',
    },
    current_round: 1,
    state: 'Active',
    member_count: memberCache.size,
    members_paid_current_round: 0,
    round_start_time: Math.floor(Date.now() / 1000),
  };
}

export async function getMemberInfo(memberAddress: string): Promise<any> {
  return memberCache.get(memberAddress) || null;
}

export async function hasPaid(round: number, memberAddress: string): Promise<boolean> {
  const member = memberCache.get(memberAddress);
  if (!member) return false;
  return member.paid_rounds?.includes(round) ?? false;
}

export async function allPaid(): Promise<boolean> {
  const members = Array.from(memberCache.values());
  if (members.length === 0) return false;
  return members.every((m: any) => m.paid_current_round);
}

export async function getReputationScore(memberAddress: string): Promise<any> {
  return memberCache.get(memberAddress)?.reputation || null;
}

export async function getReputationRating(memberAddress: string): Promise<number> {
  const rep = memberCache.get(memberAddress)?.reputation;
  if (!rep) return 100;
  const total = (rep.circles_completed || 0) + (rep.defaults || 0);
  if (total === 0) return 100;
  return Math.min(100, Math.floor(((rep.circles_completed || 0) * 100) / total));
}

export async function getBidState(): Promise<string> {
  return bidCache.size > 0 ? 'Open' : 'Closed';
}

export async function getBid(memberAddress: string): Promise<any> {
  return bidCache.get(memberAddress) || null;
}

export async function getAllBids(): Promise<any[]> {
  return Array.from(bidCache.values());
}

// Transaction building helpers

export function buildCreateCircleTx(params: {
  contribution_amount: string;
  round_length_seconds: string;
  member_cap: number;
  payout_method: number;
  min_collateral: string;
  grace_period_seconds: string;
}) {
  return {
    contract_id: config.contracts.circleFactory,
    method: 'create_circle',
    params: {
      contribution_amount: params.contribution_amount,
      round_length_seconds: params.round_length_seconds,
      member_cap: params.member_cap,
      payout_method: { 0: 'Lottery', 1: 'SealedBidAuction', 2: 'PriorityBased' }[params.payout_method],
      min_collateral: params.min_collateral,
      grace_period_seconds: params.grace_period_seconds,
    },
  };
}

export function buildJoinVaultTx(memberAddress: string, tokenAddress: string) {
  // Cache the member
  memberCache.set(memberAddress, {
    address: memberAddress,
    collateral_staked: '50000000',
    has_received_pot: false,
    rounds_missed: 0,
    is_active: true,
    paid_rounds: [],
    paid_current_round: false,
    reputation: {
      circles_joined: 1,
      circles_completed: 0,
      defaults: 0,
      total_slashed: '0',
      last_updated: Math.floor(Date.now() / 1000),
    },
  });

  return {
    contract_id: config.contracts.contributionVault,
    method: 'join_vault',
    params: { member: memberAddress, usdc_token: tokenAddress },
  };
}

export function buildContributeTx(memberAddress: string, tokenAddress: string) {
  const member = memberCache.get(memberAddress);
  if (member) {
    member.paid_current_round = true;
    if (!member.paid_rounds) member.paid_rounds = [];
    member.paid_rounds.push(1);
  }

  return {
    contract_id: config.contracts.contributionVault,
    method: 'contribute',
    params: { member: memberAddress, usdc_token: tokenAddress },
  };
}

export function buildReleasePayoutTx(winnerAddress: string, tokenAddress: string) {
  const member = memberCache.get(winnerAddress);
  if (member) {
    member.has_received_pot = true;
  }

  return {
    contract_id: config.contracts.contributionVault,
    method: 'release_payout',
    params: { winner: winnerAddress, usdc_token: tokenAddress },
  };
}

export function buildSubmitBidTx(memberAddress: string, discountBps: number, round: number) {
  bidCache.set(memberAddress, {
    member: memberAddress,
    discount_bps: discountBps,
    round,
  });

  return {
    contract_id: config.contracts.bidEngine,
    method: 'submit_bid',
    params: { member: memberAddress, discount_bps: discountBps, round },
  };
}
