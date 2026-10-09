import { nativeToScVal } from '@stellar/stellar-sdk';
import { createSorobanClient, SorobanRpcClient } from './sorobanRpc';

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
}

export function createChainReader(client: SorobanRpcClient = createSorobanClient()): ChainReader {
  return new ChainReader(client);
}
