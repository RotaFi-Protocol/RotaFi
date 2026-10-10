import type {
  AnchorInfo,
  AnchorTransfer,
  AnchorTransaction,
} from '@/types';

/**
 * Client for the RotaFi backend's SEP-24 anchor proxy.
 *
 * The backend resolves the anchor's stellar.toml, relays interactive
 * deposit/withdrawal requests and proxies SEP-10 authentication, so the
 * frontend only talks to a single CORS-friendly origin.
 */
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, init);
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      payload?.message || payload?.error || `Request failed with status ${res.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return payload as T;
}

function post(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/** Fetches the anchor's SEP-24 capabilities (assets, fees, auth). */
export function fetchAnchorInfo(): Promise<AnchorInfo> {
  return request<AnchorInfo>('/api/v1/anchors/info');
}

export interface WebAuthChallenge {
  transaction: string;
  network_passphrase: string;
  web_auth_endpoint: string;
}

/** Requests a SEP-10 challenge transaction for the connected wallet to sign. */
export function fetchAuthChallenge(account: string): Promise<WebAuthChallenge> {
  return request<WebAuthChallenge>(
    `/api/v1/anchors/auth/challenge?account=${encodeURIComponent(account)}`,
  );
}

/** Submits a signed SEP-10 challenge and receives a JWT. */
export function submitAuth(signedTransaction: string): Promise<{ token: string }> {
  return request<{ token: string }>('/api/v1/anchors/auth', post({ transaction: signedTransaction }));
}

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export interface StartTransferPayload {
  asset_code: string;
  account: string;
  amount?: string;
  dest?: string;
  memo?: string;
  lang?: string;
}

/** Starts an interactive SEP-24 deposit (fiat on-ramp). */
export function startDeposit(payload: StartTransferPayload, token?: string): Promise<AnchorTransfer> {
  return request<AnchorTransfer>('/api/v1/anchors/deposit', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

/** Starts an interactive SEP-24 withdrawal (fiat off-ramp / cash out). */
export function startWithdraw(payload: StartTransferPayload, token?: string): Promise<AnchorTransfer> {
  return request<AnchorTransfer>('/api/v1/anchors/withdraw', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

/** Polls the current status of a SEP-24 transfer. */
export function fetchTransaction(id: string, token?: string): Promise<AnchorTransaction> {
  return request<AnchorTransaction>(`/api/v1/anchors/transactions/${encodeURIComponent(id)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}