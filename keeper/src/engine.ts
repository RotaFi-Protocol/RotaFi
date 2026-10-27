import {
  KeeperConfig,
  KeeperState,
  VaultErrorState,
  VaultState,
  RoundLifecycleEvent,
} from './types';
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
  private vaultErrors: Map<number, VaultErrorState> = new Map();

  constructor(config: KeeperConfig) {
    this.config = config;
    this.state = {
      isRunning: false,
      lastPollTime: 0,
      roundsProcessed: 0,
      defaultsDetected: 0,
      payoutsTriggered: 0,
      errors: 0,
      vaultErrors: {},
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
    logger.info('Keeper engine stopped', { state: this.getState() });
  }

  getState(): KeeperState {
    const serializedErrors: Record<number, VaultErrorState> = {};
    for (const [circleId, errState] of this.vaultErrors.entries()) {
      serializedErrors[circleId] = { ...errState };
    }
    return {
      ...this.state,
      vaultErrors: serializedErrors,
    };
  }

  getVaultErrorState(circleId: number): VaultErrorState | undefined {
    const state = this.vaultErrors.get(circleId);
    return state ? { ...state } : undefined;
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
   * Isolates per-vault errors with retry/backoff so one failing vault cannot
   * abort processing of other active vaults.
   */
  private async poll(): Promise<void> {
    if (!this.state.isRunning) return;

    const correlationId = `poll-${Date.now()}`;
    withCorrelation(correlationId, (log) => {
      log.info('Keeper poll cycle started');
    });

    this.state.lastPollTime = Date.now();

    for (const [circleId, vault] of this.vaultStates) {
      if (!vault || vault.state !== 'Active') continue;

      const existingError = this.vaultErrors.get(circleId);
      if (existingError && Date.now() < existingError.nextRetryTime) {
        logger.debug('Skipping vault in backoff window', {
          circleId,
          nextRetryTime: existingError.nextRetryTime,
        });
        continue;
      }

      const roundCorrelationId = createCorrelationId(circleId, vault.current_round);
      try {
        await this.processVaultWithRetry(vault, roundCorrelationId);
        if (existingError && existingError.consecutiveFailures > 0) {
          this.vaultErrors.set(circleId, {
            ...existingError,
            consecutiveFailures: 0,
            nextRetryTime: 0,
          });
        }
      } catch (error: any) {
        this.recordVaultFailure(circleId, error);
      }
    }
  }

  private async processVaultWithRetry(vault: VaultState, correlationId: string): Promise<void> {
    const maxRetries = Math.max(0, this.config.maxRetriesPerVault ?? 2);
    const baseDelayMs = Math.max(1, this.config.retryDelayMs ?? 10);

    let attempt = 0;
    while (true) {
      try {
        await this.processVault(vault, correlationId);
        return;
      } catch (error) {
        if (attempt >= maxRetries) {
          throw error;
        }
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private recordVaultFailure(circleId: number, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const now = Date.now();
    const prev = this.vaultErrors.get(circleId);
    const consecutiveFailures = (prev?.consecutiveFailures ?? 0) + 1;
    const totalFailures = (prev?.totalFailures ?? 0) + 1;

    const backoffBaseMs = Math.max(0, this.config.backoffBaseMs ?? 0);
    const maxBackoffMs = Math.max(backoffBaseMs, this.config.maxBackoffMs ?? 60_000);
    const backoffDelay =
      backoffBaseMs > 0
        ? Math.min(maxBackoffMs, backoffBaseMs * Math.pow(2, consecutiveFailures - 1))
        : 0;

    const updated: VaultErrorState = {
      consecutiveFailures,
      totalFailures,
      lastError: message,
      lastErrorTime: now,
      nextRetryTime: now + backoffDelay,
    };

    this.vaultErrors.set(circleId, updated);
    this.state.errors += 1;

    logger.error('Error processing vault in poll cycle', {
      circleId,
      error: message,
      consecutiveFailures,
      totalFailures,
      nextRetryTime: updated.nextRetryTime,
    });
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
