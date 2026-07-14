import { KeeperConfig, KeeperState, VaultState, MemberInfo, RoundLifecycleEvent } from './types';
import { checkRoundAdvancement, findDefaulters, determineSlashActions, isCircleComplete } from './watchers';
import { createCorrelationId, withCorrelation } from './logger';
import logger from './logger';

export class KeeperEngine {
  private config: KeeperConfig;
  private state: KeeperState;
  private pollTimer: NodeJS.Timeout | null = null;

  // In-memory state representing what the Soroban RPC would return
  private vaultStates: Map<number, VaultState> = new Map();
  private memberPayments: Map<string, Map<string, boolean>> = new Map();

  constructor(config: KeeperConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      lastPollTime: 0,
      roundsProcessed: 0,
      defaultsDetected: 0,
      payoutsTriggered: 0,
      errors: 0,
    };
  }

  start(): void {
    if (this.state.isRunning) return;
    this.state.isRunning = true;

    logger.info('Keeper engine started', {
      pollIntervalMs: this.config.pollIntervalMs,
      vaultAddress: this.config.vaultAddress,
    });

    this.poll();
    this.pollTimer = setInterval(() => this.poll(), this.config.pollIntervalMs);
  }

  stop(): void {
    this.state.isRunning = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    logger.info('Keeper engine stopped', { state: this.state });
  }

  getState(): KeeperState {
    return { ...this.state };
  }

  // For testing: inject vault state
  setVaultState(vault: VaultState): void {
    this.vaultStates.set(vault.circle_id, vault);
  }

  // For testing: inject member payment status
  setMemberPayment(circleId: number, memberAddress: string, hasPaid: boolean): void {
    const key = `${circleId}`;
    if (!this.memberPayments.has(key)) {
      this.memberPayments.set(key, new Map());
    }
    this.memberPayments.get(key)!.set(memberAddress, hasPaid);
  }

  getMemberPaymentStatus(circleId: number): Map<string, boolean> {
    const key = `${circleId}`;
    return this.memberPayments.get(key) || new Map();
  }

  /**
   * Main polling loop. Called every POLL_INTERVAL_MS.
   * Checks each active vault for round advancement, defaults, and completion.
   */
  private async poll(): Promise<void> {
    if (!this.state.isRunning) return;

    const correlationId = `poll-${Date.now()}`;
    withCorrelation(correlationId, (log) => {
      log.info('Keeper poll cycle started');
    });

    this.state.lastPollTime = Date.now();

    try {
      for (const [circleId, vault] of this.vaultStates) {
        if (vault.state !== 'Active') continue;

        const roundCorrelationId = createCorrelationId(circleId, vault.current_round);
        await this.processVault(vault, roundCorrelationId);
      }
    } catch (error: any) {
      this.state.errors++;
      logger.error('Error in poll cycle', { error: error.message });
    }
  }

  private async processVault(vault: VaultState, correlationId: string): Promise<void> {
    withCorrelation(correlationId, (log) => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const result = checkRoundAdvancement(vault, currentTimestamp);

      log.info('Processing vault', {
        circleId: vault.circle_id,
        round: vault.current_round,
        membersPaid: vault.members_paid_current_round,
        memberCount: vault.member_count,
        advancement: result,
      });

      if (result.advanced) {
        this.state.roundsProcessed++;
        this.handleRoundAdvancement(vault, result.reason || 'unknown');

        if (result.reason === 'grace_period_expired') {
          const paymentStatus = this.getMemberPaymentStatus(vault.circle_id);
          const defaulters = findDefaulters(vault, paymentStatus);

          if (defaulters.length > 0) {
            this.state.defaultsDetected += defaulters.length;
            log.warn('Defaults detected', {
              circleId: vault.circle_id,
              round: vault.current_round,
              defaulterCount: defaulters.length,
            });

            const slashActions = determineSlashActions(vault, defaulters, Math.floor(Date.now() / 1000));
            for (const action of slashActions) {
              log.info('Slashing defaulter', {
                circleId: vault.circle_id,
                round: vault.current_round,
                member: action.member,
                slashPercent: action.slashPercent,
              });
            }
          }
        }

        // Advance vault to next round
        vault.current_round += 1;
        vault.members_paid_current_round = 0;
        vault.round_start_time = Math.floor(Date.now() / 1000);

        if (isCircleComplete(vault)) {
          vault.state = 'Completed' as any;
          log.info('Circle completed', {
            circleId: vault.circle_id,
            totalRounds: vault.total_rounds,
          });
        }

        this.state.payoutsTriggered++;
      }
    });
  }

  private handleRoundAdvancement(
    vault: VaultState,
    reason: string,
  ): void {
    const event: RoundLifecycleEvent = {
      circleId: vault.circle_id,
      round: vault.current_round,
      phase: reason === 'grace_period_expired' ? 'slashing' : 'payout',
      timestamp: Date.now(),
      details: { reason },
    };

    logger.info('Round lifecycle event', event);
  }
}
