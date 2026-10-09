import {
  Account,
  Contract,
  TransactionBuilder,
  scValToNative,
  rpc,
} from '@stellar/stellar-sdk';
import type { CircleLifecycleState } from '@/types';
import { NETWORK } from './contracts';

const SOURCE_PLACEHOLDER =
  'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

export interface OnChainVault {
  current_round: number;
  state: CircleLifecycleState;
  member_count: number;
  members_paid_current_round: number;
  config: {
    circle_id: number;
    member_cap: number;
    total_rounds: number;
    contribution_per_member: string;
  };
}

function mapState(state: unknown): CircleLifecycleState {
  const normalized = String(state).toLowerCase();
  if (normalized.includes('completed')) return 'Completed';
  if (normalized.includes('active')) return 'Active';
  return 'Setup';
}

/**
 * Reads `get_vault` from the deployed ContributionVault contract on the
 * configured network using a read-only transaction simulation.
 *
 * Only used when `NEXT_PUBLIC_USE_LIVE_CONTRACTS=true`; the default E2E path
 * runs against the deterministic in-browser simulation instead.
 */
export async function fetchOnChainVault(): Promise<OnChainVault> {
  const server = new rpc.Server(NETWORK.rpcUrl);
  const contract = new Contract(NETWORK.contracts.contributionVault);
  const source = new Account(SOURCE_PLACEHOLDER, '0');

  const tx = new TransactionBuilder(source, {
    fee: '100',
    networkPassphrase: NETWORK.passphrase,
  })
    .addOperation(contract.call('get_vault'))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(`get_vault simulation failed: ${simulated.error}`);
  }

  const retval = (simulated as rpc.Api.SimulateTransactionSuccessResponse)
    .result?.retval;
  if (!retval) {
    throw new Error('get_vault returned no value');
  }

  const native = scValToNative(retval) as Record<string, any>;
  const config = native.config ?? {};

  return {
    current_round: Number(native.current_round ?? 0),
    state: mapState(native.state),
    member_count: Number(native.member_count ?? 0),
    members_paid_current_round: Number(
      native.members_paid_current_round ?? 0,
    ),
    config: {
      circle_id: Number(config.circle_id ?? 0),
      member_cap: Number(config.member_cap ?? 0),
      total_rounds: Number(config.total_rounds ?? 0),
      contribution_per_member: String(
        config.contribution_per_member ?? '0',
      ),
    },
  };
}
