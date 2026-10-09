import { ChainReader, createChainReader } from '../../src/services/chainReader';
import {
  RpcContractAddresses,
  SorobanRpcClient,
  createSorobanClient,
} from '../../src/services/sorobanRpc';

/**
 * Integration tests only run when explicitly requested, so a normal
 * `npm test` never touches the network.
 */
export const INTEGRATION_ENABLED = process.env.RUN_INTEGRATION_TESTS === 'true';

export const integrationDescribe = INTEGRATION_ENABLED ? describe : describe.skip;

export const TESTNET_RPC_URL =
  process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';

/** Contract ids from contract/DEPLOYED_ADDRESSES.md. */
export const TESTNET_ADDRESSES: RpcContractAddresses = {
  circleFactory:
    process.env.CIRCLE_FACTORY_ADDRESS ||
    'CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6',
  contributionVault:
    process.env.CONTRIBUTION_VAULT_ADDRESS ||
    'CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO',
  reputationRegistry:
    process.env.REPUTATION_REGISTRY_ADDRESS ||
    'CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC',
  bidEngine:
    process.env.BID_ENGINE_ADDRESS ||
    'CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P',
};

/** Deployer/known testnet account used for reputation lookups. */
export const DEPLOYER_ADDRESS = 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47';

export function testnetClient(): SorobanRpcClient {
  return createSorobanClient({
    rpcUrl: TESTNET_RPC_URL,
    contracts: TESTNET_ADDRESSES,
  });
}

export function testnetReader(): ChainReader {
  return createChainReader(testnetClient());
}
