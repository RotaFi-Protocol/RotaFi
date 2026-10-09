import { Address, nativeToScVal } from '@stellar/stellar-sdk';
import { ContractResult, createSorobanClient, SorobanRpcClient } from './sorobanRpc';

export interface CircleConfig {
  contribution_amount: string;
  round_length_seconds: string;
  member_cap: number;
  payout_method: number;
  min_collateral: string;
  grace_period_seconds: string;
}

export interface Circle {
  id: number;
  organizer: string;
  config: CircleConfig;
  created_at: string;
  active: boolean;
}

function toBigIntString(value: unknown): string {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value;
  return '0';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  return 0;
}

/**
 * Decodes the `payout_method` enum. Depending on how the SDK encodes a
 * unit-only contract enum it may arrive as a number or a tagged object.
 */
function normalizePayoutMethod(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'bigint') return Number(raw);
  if (typeof raw === 'string') {
    const named: Record<string, number> = {
      Lottery: 0,
      SealedBidAuction: 1,
      PriorityBased: 2,
    };
    return named[raw] ?? 0;
  }
  if (raw && typeof raw === 'object') {
    const tagged = raw as { tag?: string; value?: unknown };
    if (typeof tagged.tag === 'string') return normalizePayoutMethod(tagged.tag);
  }
  return 0;
}

export function parseCircle(raw: unknown): Circle | null {
  if (raw === null || raw === undefined) return null;
  const circle = raw as Record<string, any>;
  const config = (circle.config ?? {}) as Record<string, any>;

  return {
    id: toNumber(circle.id),
    organizer: String(circle.organizer),
    config: {
      contribution_amount: toBigIntString(config.contribution_amount),
      round_length_seconds: toBigIntString(config.round_length_seconds),
      member_cap: toNumber(config.member_cap),
      payout_method: normalizePayoutMethod(config.payout_method),
      min_collateral: toBigIntString(config.min_collateral),
      grace_period_seconds: toBigIntString(config.grace_period_seconds),
    },
    created_at: toBigIntString(circle.created_at),
    active: Boolean(circle.active),
  };
}

export type VaultState = 'Setup' | 'Active' | 'Paused' | 'Completed';

const VAULT_STATES: VaultState[] = ['Setup', 'Active', 'Paused', 'Completed'];

export interface VaultConfig {
  circle_id: number;
  token_address: string;
  contribution_per_member: string;
  member_cap: number;
  total_rounds: number;
  min_collateral: string;
  round_length_seconds: string;
  grace_period_seconds: string;
}

export interface Vault {
  config: VaultConfig;
  current_round: number;
  state: VaultState;
  member_count: number;
  members_paid_current_round: number;
  round_start_time: string;
}

function normalizeVaultState(raw: unknown): VaultState {
  if (typeof raw === 'number' || typeof raw === 'bigint') {
    return VAULT_STATES[Number(raw)] ?? 'Setup';
  }
  if (typeof raw === 'string') {
    const index = VAULT_STATES.indexOf(raw as VaultState);
    if (index >= 0) return raw as VaultState;
  }
  if (raw && typeof raw === 'object') {
    const tagged = raw as { tag?: string };
    if (typeof tagged.tag === 'string') return normalizeVaultState(tagged.tag);
  }
  return 'Setup';
}

export function parseVault(raw: unknown): Vault {
  const vault = raw as Record<string, any>;
  const config = (vault.config ?? {}) as Record<string, any>;

  return {
    config: {
      circle_id: toNumber(config.circle_id),
      token_address: String(config.token_address),
      contribution_per_member: toBigIntString(config.contribution_per_member),
      member_cap: toNumber(config.member_cap),
      total_rounds: toNumber(config.total_rounds),
      min_collateral: toBigIntString(config.min_collateral),
      round_length_seconds: toBigIntString(config.round_length_seconds),
      grace_period_seconds: toBigIntString(config.grace_period_seconds),
    },
    current_round: toNumber(vault.current_round),
    state: normalizeVaultState(vault.state),
    member_count: toNumber(vault.member_count),
    members_paid_current_round: toNumber(vault.members_paid_current_round),
    round_start_time: toBigIntString(vault.round_start_time),
  };
}

export interface ReputationScore {
  address: string;
  circles_joined: number;
  circles_completed: number;
  defaults: number;
  total_slashed: string;
  last_updated: string;
}

export function parseReputationScore(raw: unknown): ReputationScore | null {
  if (raw === null || raw === undefined) return null;
  const score = raw as Record<string, any>;
  return {
    address: String(score.address),
    circles_joined: toNumber(score.circles_joined),
    circles_completed: toNumber(score.circles_completed),
    defaults: toNumber(score.defaults),
    total_slashed: toBigIntString(score.total_slashed),
    last_updated: toBigIntString(score.last_updated),
  };
}

export class ChainReader {
  constructor(private readonly client: SorobanRpcClient) {}

  get rpc(): SorobanRpcClient {
    return this.client;
  }

  /** Reads a circle from the deployed Circle Factory, or null if absent. */
  async getCircle(id: number): Promise<Circle | null> {
    const raw = await this.client.readContract(
      this.client.contracts.circleFactory,
      'get_circle',
      [nativeToScVal(id, { type: 'u32' })],
    );
    return parseCircle(raw);
  }

  /** Returns the total number of circles ever created by the factory. */
  async getCircleCount(): Promise<number> {
    const raw = await this.client.readContract<number | bigint>(
      this.client.contracts.circleFactory,
      'circle_count',
    );
    return toNumber(raw);
  }

  /** Reads the deployed Contribution Vault state via `get_vault`. */
  async getVaultState(): Promise<Vault> {
    const raw = await this.client.readContract(
      this.client.contracts.contributionVault,
      'get_vault',
    );
    return parseVault(raw);
  }

  /**
   * Reads the vault, capturing the host trap raised when the deployed vault
   * has not been initialised yet instead of throwing.
   */
  async tryGetVaultState(): Promise<ContractResult<Vault>> {
    const result = await this.client.tryReadContract(
      this.client.contracts.contributionVault,
      'get_vault',
    );
    if (!result.ok) return result;
    return { ok: true, value: parseVault(result.value) };
  }

  /** Reads a member's reputation record, or null if none exists. */
  async getReputationScore(address: string): Promise<ReputationScore | null> {
    const raw = await this.client.readContract(
      this.client.contracts.reputationRegistry,
      'get_score',
      [new Address(address).toScVal()],
    );
    return parseReputationScore(raw);
  }

  /** Returns a member's reputation rating (0-100, higher is better). */
  async getReputationRating(address: string): Promise<number> {
    const raw = await this.client.readContract<number | bigint>(
      this.client.contracts.reputationRegistry,
      'get_rating',
      [new Address(address).toScVal()],
    );
    return toNumber(raw);
  }
}

export function createChainReader(client: SorobanRpcClient = createSorobanClient()): ChainReader {
  return new ChainReader(client);
}
