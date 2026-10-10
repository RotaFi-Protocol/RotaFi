import { defineConfig, devices } from '@playwright/test';

const rpcUrl =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const passphrase =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
  'Test SDF Network ; September 2015';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_API_URL:
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
      NEXT_PUBLIC_SOROBAN_RPC_URL: rpcUrl,
      NEXT_PUBLIC_NETWORK_PASSPHRASE: passphrase,
      NEXT_PUBLIC_USE_LIVE_CONTRACTS:
        process.env.E2E_LIVE_TESTNET === '1' ? 'true' : 'false',
      NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS:
        process.env.NEXT_PUBLIC_CIRCLE_FACTORY_ADDRESS ||
        'CC2XL3M4FN3R2YLRGUKFWVQGWBTDQ6O4JZO66V6VGPY64QWCJBWHDSX6',
      NEXT_PUBLIC_CONTRIBUTION_VAULT_ADDRESS:
        process.env.NEXT_PUBLIC_CONTRIBUTION_VAULT_ADDRESS ||
        'CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO',
      NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS:
        process.env.NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS ||
        'CDVS7X47ICQQGRR67K4FL7DAL3XB3FSSAWKXWF4RIKJVWEHTJ6AXJTUC',
      NEXT_PUBLIC_BID_ENGINE_ADDRESS:
        process.env.NEXT_PUBLIC_BID_ENGINE_ADDRESS ||
        'CD3OE7WPUSSM7ZR2552CVNZH2O5LHV52UKHSPR3VYVG63CWHUOXNDM6P',
      NEXT_PUBLIC_ANCHOR_POLL_INTERVAL_MS: '250',
    },
  },
});