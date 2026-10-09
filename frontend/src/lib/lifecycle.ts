import type { CircleLifecycle, CircleLifecycleState } from '@/types';

const STORAGE_PREFIX = 'rotafi_lifecycle_';

export interface LifecycleSeed {
  circleId: number;
  tokenSymbol: string;
  contributionAmount: string;
  memberCap: number;
  totalRounds?: number;
}

/** Builds a fresh lifecycle in the `Setup` state (not yet joined). */
export function createLifecycle(seed: LifecycleSeed): CircleLifecycle {
  return {
    circleId: seed.circleId,
    tokenSymbol: seed.tokenSymbol,
    contributionAmount: seed.contributionAmount,
    memberCap: seed.memberCap,
    totalRounds: seed.totalRounds ?? seed.memberCap,
    currentRound: 0,
    membersPaidCurrentRound: 0,
    state: 'Setup',
    joined: false,
    hasReceivedPot: false,
    history: [],
  };
}

/** Marks the connected wallet as a member and activates the circle. */
export function joinCircle(state: CircleLifecycle): CircleLifecycle {
  if (state.joined) return state;
  return {
    ...state,
    joined: true,
    state: 'Active',
    currentRound: 1,
    membersPaidCurrentRound: 0,
  };
}

/**
 * Records the connected member's contribution for the current round.
 *
 * Peer members are simulated as paying in the same round, so a single wallet
 * can drive a full circle to completion in the E2E flow.
 */
export function contribute(state: CircleLifecycle): CircleLifecycle {
  if (!state.joined || state.state !== 'Active') return state;
  if (state.membersPaidCurrentRound >= state.memberCap) return state;
  return { ...state, membersPaidCurrentRound: state.memberCap };
}

/** Deterministic pseudo-member address for display and pot rotation. */
export function memberAddress(index: number): string {
  if (index === 0) return 'SELF';
  const suffix = String(index).padStart(2, '0');
  return `G${'A'.repeat(53)}${suffix}`;
}

export function winnerForRound(
  state: CircleLifecycle,
  self: string,
): string {
  const index = (state.currentRound - 1) % state.memberCap;
  return index === 0 ? self : memberAddress(index);
}

/** Total pot for one round in the token's smallest unit. */
export function potAmount(state: CircleLifecycle): string {
  return (
    BigInt(state.contributionAmount || '0') * BigInt(state.memberCap)
  ).toString();
}

/** Releases the pot to the round winner and advances the round. */
export function releasePayout(
  state: CircleLifecycle,
  self: string,
): CircleLifecycle {
  if (state.state !== 'Active') return state;
  if (state.membersPaidCurrentRound < state.memberCap) return state;

  const winner = winnerForRound(state, self);
  const record = {
    round: state.currentRound,
    winner,
    payout_amount: potAmount(state),
    completed_at: Date.now(),
  };
  const nextRound = state.currentRound + 1;
  const completed = nextRound > state.totalRounds;

  return {
    ...state,
    membersPaidCurrentRound: 0,
    currentRound: completed ? state.totalRounds : nextRound,
    state: completed ? 'Completed' : 'Active',
    hasReceivedPot: state.hasReceivedPot || winner === self,
    history: [...state.history, record],
  };
}

export function canContribute(state: CircleLifecycle): boolean {
  return (
    state.joined &&
    state.state === 'Active' &&
    state.membersPaidCurrentRound < state.memberCap
  );
}

export function canReleasePayout(state: CircleLifecycle): boolean {
  return (
    state.joined &&
    state.state === 'Active' &&
    state.membersPaidCurrentRound >= state.memberCap
  );
}

export function progressPercent(state: CircleLifecycle): number {
  if (!state.joined || state.state === 'Setup') return 0;
  if (state.state === 'Completed') return 100;
  return Math.round(
    (state.history.length / state.totalRounds) * 100,
  );
}

function storageKey(circleId: number): string {
  return `${STORAGE_PREFIX}${circleId}`;
}

export function loadLifecycle(circleId: number): CircleLifecycle | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(storageKey(circleId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CircleLifecycle;
  } catch {
    return null;
  }
}

export function saveLifecycle(state: CircleLifecycle): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(state.circleId), JSON.stringify(state));
}

export function clearLifecycle(circleId: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(storageKey(circleId));
}

export function listLifecycles(): CircleLifecycle[] {
  if (typeof window === 'undefined') return [];
  const results: CircleLifecycle[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      results.push(JSON.parse(raw) as CircleLifecycle);
    } catch {
      continue;
    }
  }
  return results.sort((a, b) => a.circleId - b.circleId);
}

export type { CircleLifecycleState };
