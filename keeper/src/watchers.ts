import { createCorrelationId, withCorrelation } from './logger';
import { VaultState } from './types';
import { determineWinner, LotteryDrawInput } from './randomness';

export interface RoundAdvancementResult {
  advanced: boolean;
  newRound?: number;
  reason?: string;
}

/**
 * Checks if the current round should be advanced (all paid or grace period expired)
 * and returns the next action.
 */
export function checkRoundAdvancement(
  vault: VaultState,
  currentTimestamp: number,
): RoundAdvancementResult {
  const { members_paid_current_round, member_count, round_length_seconds, grace_period_seconds, round_start_time } = vault;

  const allPaid = members_paid_current_round >= member_count;
  const roundEndTime = round_start_time + round_length_seconds;
  const graceEndTime = roundEndTime + grace_period_seconds;
  const graceExpired = currentTimestamp >= graceEndTime;
  const roundExpired = currentTimestamp >= roundEndTime;

  if (allPaid) {
    return {
      advanced: true,
      newRound: vault.current_round,
      reason: 'all_members_paid',
    };
  }

  if (graceExpired) {
    return {
      advanced: true,
      newRound: vault.current_round,
      reason: 'grace_period_expired',
    };
  }

  if (roundExpired) {
    return {
      advanced: false,
      reason: 'round_expired_grace_active',
    };
  }

  return {
    advanced: false,
    reason: 'round_in_progress',
  };
}

/**
 * Identifies members who haven't paid in the current round
 * (candidates for slashing after grace period expires).
 */
export function findDefaulters(
  vault: VaultState,
  memberPaymentStatus: Map<string, boolean>,
): string[] {
  const defaulters: string[] = [];

  for (const [member, paid] of memberPaymentStatus) {
    if (!paid) {
      defaulters.push(member);
      const correlationId = createCorrelationId(vault.circle_id, vault.current_round);
      withCorrelation(correlationId, (log) => {
        log.warn('Member defaulted on contribution', {
          circleId: vault.circle_id,
          round: vault.current_round,
          member,
        });
      });
    }
  }

  return defaulters;
}

/**
 * Determines if a slash should be applied.
 * Returns the member addresses that should be slashed along with the slash percentage.
 */
export function determineSlashActions(
  vault: VaultState,
  defaulters: string[],
  currentTimestamp: number,
): Array<{ member: string; slashPercent: number }> {
  const { round_length_seconds, grace_period_seconds, round_start_time } = vault;
  const graceEndTime = round_start_time + round_length_seconds + grace_period_seconds;

  if (currentTimestamp < graceEndTime) {
    return [];
  }

  return defaulters.map((member) => ({
    member,
    slashPercent: 50, // Default 50% slash
  }));
}

/**
 * Checks if a circle has completed all rounds.
 */
export function isCircleComplete(vault: VaultState): boolean {
  return vault.current_round > vault.total_rounds;
}

/**
 * Determines the lottery payout recipient for a round.
 *
 * The winner is not chosen here: it is derived on-chain from the members'
 * commit-reveal openings mixed with ledger data. This helper reproduces the
 * contract's derivation so the keeper can verify (or predict) the outcome
 * independently of the transaction that finalised the draw.
 */
export function determinePayoutRecipient(
  vault: VaultState,
  draw: LotteryDrawInput,
): string | null {
  if (vault.member_count === 0) return null;
  if (draw.openings.length !== draw.eligible.length) {
    return null;
  }
  return determineWinner(draw);
}
