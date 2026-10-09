import {
  Account,
  Contract,
  Keypair,
  TransactionBuilder,
  scValToNative,
  xdr,
  rpc,
} from '@stellar/stellar-sdk';
import { config } from '../config';

export interface RpcContractAddresses {
  circleFactory: string;
  contributionVault: string;
  reputationRegistry: string;
  bidEngine: string;
}

export interface SorobanRpcClientOptions {
  rpcUrl?: string;
  networkPassphrase?: string;
  contracts?: Partial<RpcContractAddresses>;
  timeoutMs?: number;
}

export interface NetworkHealth {
  status: string;
  latestLedger: number;
  oldestLedger: number;
}

/**
 * Raised when a Soroban simulation fails, either because the host rejected
 * the invocation (e.g. the contract trapped) or because the RPC responded
 * with an error.
 */
export class ContractCallError extends Error {
  readonly contractId: string;
  readonly method: string;
  readonly diagnostics?: string;

  constructor(contractId: string, method: string, message: string, diagnostics?: string) {
    super(message);
    this.name = 'ContractCallError';
    this.contractId = contractId;
    this.method = method;
    this.diagnostics = diagnostics;
  }
}

export type ContractResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ContractCallError };

export class SorobanRpcClient {
  readonly rpcUrl: string;
  readonly networkPassphrase: string;
  readonly contracts: RpcContractAddresses;
  readonly timeoutMs: number;

  private readonly server: rpc.Server;

  constructor(options: SorobanRpcClientOptions = {}) {
    this.rpcUrl = options.rpcUrl ?? config.soroban.rpcUrl;
    this.networkPassphrase = options.networkPassphrase ?? config.soroban.networkPassphrase;
    this.contracts = {
      circleFactory: options.contracts?.circleFactory ?? config.contracts.circleFactory,
      contributionVault:
        options.contracts?.contributionVault ?? config.contracts.contributionVault,
      reputationRegistry:
        options.contracts?.reputationRegistry ?? config.contracts.reputationRegistry,
      bidEngine: options.contracts?.bidEngine ?? config.contracts.bidEngine,
    };
    this.timeoutMs = options.timeoutMs ?? config.soroban.timeoutMs;
    this.server = new rpc.Server(this.rpcUrl);
  }

  get serverInstance(): rpc.Server {
    return this.server;
  }

  protected withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Soroban RPC request timed out after ${this.timeoutMs}ms`)),
        this.timeoutMs,
      );
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  async getHealth(): Promise<NetworkHealth> {
    const health = (await this.withTimeout(this.server.getHealth())) as any;
    return {
      status: health.status,
      latestLedger: health.latestLedger,
      oldestLedger: health.oldestLedger,
    };
  }

  /**
   * Simulates a read-only contract invocation without signing or submitting.
   *
   * A throwaway account is used as the transaction source because simulation
   * does not require a funded or authorised account.
   */
  async simulateCall(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
  ): Promise<rpc.Api.SimulateTransactionResponse> {
    const contract = new Contract(contractId);
    const source = new Account(Keypair.random().publicKey(), '0');
    const tx = new TransactionBuilder(source, {
      fee: '1000000',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simulation = await this.withTimeout(this.server.simulateTransaction(tx));

    if (rpc.Api.isSimulationError(simulation)) {
      throw new ContractCallError(
        contractId,
        method,
        `Soroban call '${method}' failed: ${simulation.error}`,
        (simulation as any).diagnosticEvents
          ? JSON.stringify((simulation as any).diagnosticEvents)
          : undefined,
      );
    }

    return simulation;
  }

  /**
   * Simulates a read-only contract call and decodes the return value.
   */
  async readContract<T = unknown>(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
  ): Promise<T> {
    const simulation = await this.simulateCall(contractId, method, args);
    const result = (simulation as any).result;
    if (!result) {
      throw new ContractCallError(
        contractId,
        method,
        `Soroban simulation for '${method}' returned no result`,
      );
    }
    return scValToNative(result.retval) as T;
  }

  /**
   * Like {@link readContract} but captures host/RPC failures instead of
   * throwing, so callers can handle e.g. an uninitialised contract.
   */
  async tryReadContract<T = unknown>(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
  ): Promise<ContractResult<T>> {
    try {
      const value = await this.readContract<T>(contractId, method, args);
      return { ok: true, value };
    } catch (error) {
      if (error instanceof ContractCallError) {
        return { ok: false, error };
      }
      throw error;
    }
  }
}

export function createSorobanClient(options: SorobanRpcClientOptions = {}): SorobanRpcClient {
  return new SorobanRpcClient(options);
}
