import { rpc } from '@stellar/stellar-sdk';
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
}

export function createSorobanClient(options: SorobanRpcClientOptions = {}): SorobanRpcClient {
  return new SorobanRpcClient(options);
}
