import { StellarToml } from '@stellar/stellar-sdk';
import { config } from '../config';

/**
 * Minimal client for the Stellar SEP-24 interactive transfer protocol.
 *
 * SEP-24 anchors expose a transfer server that serves `/info` and accepts
 * interactive deposit/withdrawal requests. The interactive URL returned by
 * the anchor is opened in a popup by the frontend; the API layer is
 * responsible for initiating transfers and polling their status on behalf of
 * the connected wallet.
 */

export interface Sep24AssetInfo {
  enabled: boolean;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
  fields?: Record<string, { description?: string; optional?: boolean }>;
}

export interface Sep24Info {
  deposit: Record<string, Sep24AssetInfo>;
  withdraw: Record<string, Sep24AssetInfo>;
  fee?: { enabled?: boolean };
  features?: { account_creation?: boolean; claimable_balances?: boolean };
  [key: string]: unknown;
}

export interface Sep24InteractiveResponse {
  id: string;
  url: string;
  token?: string;
  type: 'interactive_customer_info_needed';
}

export interface Sep24Transaction {
  id: string;
  status: string;
  status_eta?: number;
  amount_in?: string;
  amount_out?: string;
  amount_fee?: string;
  more_info_url?: string;
  started_at?: string;
  completed_at?: string;
  stellar_transaction_id?: string;
  external_transaction_id?: string;
  message?: string;
  asset_code?: string;
  to?: string;
  from?: string;
  [key: string]: unknown;
}

export type Sep24Asset = {
  assetCode: string;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  minAmount?: number;
  maxAmount?: number;
  feeFixed?: number;
  feePercent?: number;
  fields?: Record<string, { description?: string; optional?: boolean }>;
};

export interface ResolvedAnchor {
  homeDomain: string;
  transferServer: string;
  webAuthEndpoint: string | null;
  networkPassphrase: string;
  signingKey: string | null;
}

const tomlCache = new Map<string, { resolved: ResolvedAnchor; at: number }>();
const TOML_CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.anchor.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Resolves the anchor's stellar.toml and extracts the SEP-24 transfer server,
 * SEP-10 web auth endpoint and network passphrase. Results are cached for a
 * few minutes but can be force-refreshed with `refresh = true`.
 */
export async function resolveAnchor(
  options: { refresh?: boolean } = {},
): Promise<ResolvedAnchor> {
  const homeDomain = config.anchor.homeDomain;
  const cached = tomlCache.get(homeDomain);
  if (cached && !options.refresh && Date.now() - cached.at < TOML_CACHE_TTL_MS) {
    return cached.resolved;
  }

  let transferServer = config.anchor.transferServerSep24
    || config.anchor.transferServer
    || '';
  let webAuthEndpoint: string | null = null;
  let networkPassphrase = config.soroban.networkPassphrase;
  let signingKey: string | null = null;

  const toml = await StellarToml.Resolver.resolve(homeDomain, {
    timeout: config.anchor.timeoutMs,
  });

  transferServer =
    (toml.TRANSFER_SERVER_SEP0024 as string) ||
    (toml.TRANSFER_SERVER as string) ||
    transferServer;
  webAuthEndpoint = (toml.WEB_AUTH_ENDPOINT as string) ?? null;
  networkPassphrase = (toml.NETWORK_PASSPHRASE as string) || networkPassphrase;
  signingKey = (toml.SIGNING_KEY as string) ?? null;

  if (!transferServer) {
    throw new Error(
      `No SEP-24 transfer server advertised by ${homeDomain} (stellar.toml has no TRANSFER_SERVER_SEP0024)`,
    );
  }

  const resolved: ResolvedAnchor = {
    homeDomain,
    transferServer,
    webAuthEndpoint,
    networkPassphrase,
    signingKey,
  };
  tomlCache.set(homeDomain, { resolved, at: Date.now() });
  return resolved;
}

function authHeaders(token?: string): Record<string, string> {
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

/** Fetches the SEP-24 `/info` endpoint for every supported deposit/withdraw asset. */
export async function getSep24Info(): Promise<Sep24Info> {
  const { transferServer } = await resolveAnchor();
  const res = await fetchWithTimeout(`${transferServer}/info`);
  if (!res.ok) {
    throw new Error(`Anchor /info failed with status ${res.status}`);
  }
  return (await res.json()) as Sep24Info;
}

/** Returns deposit/withdraw metadata for a single asset code. */
export async function getSep24AssetInfo(assetCode: string): Promise<Sep24Asset> {
  const info = await getSep24Info();
  const deposit = info.deposit?.[assetCode];
  const withdraw = info.withdraw?.[assetCode];
  return {
    assetCode,
    depositEnabled: Boolean(deposit?.enabled),
    withdrawEnabled: Boolean(withdraw?.enabled),
    minAmount: Math.min(deposit?.min_amount ?? Number.MAX_SAFE_INTEGER, withdraw?.min_amount ?? Number.MAX_SAFE_INTEGER),
    maxAmount: Math.max(deposit?.max_amount ?? 0, withdraw?.max_amount ?? 0),
    feeFixed: deposit?.fee_fixed ?? withdraw?.fee_fixed,
    feePercent: deposit?.fee_percent ?? withdraw?.fee_percent,
    fields: withdraw?.fields,
  };
}

export interface Sep24DepositParams {
  assetCode: string;
  account: string;
  amount?: string;
  lang?: string;
  memo?: string;
}

/**
 * Starts an interactive SEP-24 deposit (fiat -> Stellar) and returns the
 * interactive URL the client must open in a popup, plus the transaction id
 * used for status polling.
 */
export async function startSep24Deposit(
  params: Sep24DepositParams,
  token?: string,
): Promise<Sep24InteractiveResponse> {
  const { transferServer } = await resolveAnchor();
  const body = new URLSearchParams({
    asset_code: params.assetCode,
    account: params.account,
    lang: params.lang || 'en',
  });
  if (params.amount) body.set('amount', params.amount);
  if (params.memo) body.set('memo', params.memo);

  const res = await fetchWithTimeout(`${transferServer}/transactions/deposit/interactive`, {
    method: 'POST',
    headers: token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
      : { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return handleInteractiveResponse(res, params.assetCode);
}

export interface Sep24WithdrawalParams {
  assetCode: string;
  account: string;
  amount?: string;
  dest?: string;
  lang?: string;
  memo?: string;
}

/**
 * Starts an interactive SEP-24 withdrawal (Stellar -> fiat) and returns the
 * interactive URL for cashing out a received pot.
 */
export async function startSep24Withdrawal(
  params: Sep24WithdrawalParams,
  token?: string,
): Promise<Sep24InteractiveResponse> {
  const { transferServer } = await resolveAnchor();
  const body = new URLSearchParams({
    asset_code: params.assetCode,
    account: params.account,
    lang: params.lang || 'en',
  });
  if (params.amount) body.set('amount', params.amount);
  if (params.dest) body.set('dest', params.dest);
  if (params.memo) body.set('memo', params.memo);

  const res = await fetchWithTimeout(`${transferServer}/transactions/withdraw/interactive`, {
    method: 'POST',
    headers: token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' }
      : { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return handleInteractiveResponse(res, params.assetCode);
}

async function handleInteractiveResponse(
  res: Response,
  assetCode: string,
): Promise<Sep24InteractiveResponse> {
  const payload = (await (res.json() as Promise<unknown>).catch(() => null)) as any;
  if (!res.ok) {
    const message =
      (payload as any)?.error || (payload as any)?.message || `Anchor responded with status ${res.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  if (payload.status === 'error') {
    const error = new Error(payload.error || 'Anchor reported an error');
    (error as any).status = 500;
    throw error;
  }
  return payload as Sep24InteractiveResponse;
}

/** Fetches the status of a SEP-24 transfer started earlier. */
export async function getSep24Transaction(
  id: string,
  token?: string,
): Promise<Sep24Transaction> {
  const { transferServer } = await resolveAnchor();
  const url = `${transferServer}/transaction?id=${encodeURIComponent(id)}&lang=${encodeURIComponent('en')}`;
  const res = await fetchWithTimeout(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const payload = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    const message =
      payload?.error || `Anchor transaction lookup failed with status ${res.status}`;
    throw new Error(message);
  }
  return (payload?.transaction ?? payload) as Sep24Transaction;
}

/** True when a SEP-24 transaction has reached a terminal state. */
export function isTerminalSep24Status(status?: string): boolean {
  return Boolean(
    status &&
      ['completed', 'pending_external', 'no_market', 'too_small', 'too_large', 'error'].includes(
        status,
      ),
  );
}

/** Convenience wrapper: asset codes the anchor accepts for deposit this session. */
export async function listDepositAssets(): Promise<string[]> {
  const info = await getSep24Info();
  return Object.entries(info.deposit || {})
    .filter(([, v]) => v.enabled)
    .map(([code]) => code)
    .sort();
}