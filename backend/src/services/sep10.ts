import { resolveAnchor } from './sep24';

/**
 * SEP-10 (Stellar Web Authentication) helpers.
 *
 * The test anchor requires SEP-10 authentication before it will accept SEP-24
 * deposit/withdrawal requests. The backend cannot sign the challenge on the
 * user's behalf, so it proxies the challenge down to the client, which signs
 * it with the connected wallet and posts it back for a JWT.
 */

export interface WebAuthChallenge {
  transaction: string;
  network_passphrase: string;
  web_auth_endpoint: string;
}

const WEB_AUTH_ENDPOINT_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Requests a SEP-10 challenge transaction for the given account. The returned
 * XDR is signed by the client's wallet and submitted back via
 * `submitWebAuthChallenge`.
 */
export async function getWebAuthChallenge(account: string): Promise<WebAuthChallenge> {
  const { webAuthEndpoint, networkPassphrase } = await resolveAnchor();
  if (!webAuthEndpoint) {
    throw Object.assign(
      new Error('Anchor does not advertise a SEP-10 WEB_AUTH_ENDPOINT'),
      { status: 501 },
    );
  }

  const url = `${webAuthEndpoint}?account=${encodeURIComponent(account)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let payload: any;
  try {
    const res = await fetch(url, { signal: controller.signal });
    payload = await res.json().catch(() => null);
    if (!res.ok) {
      throw Object.assign(
        new Error(payload?.error || `SEP-10 challenge failed with status ${res.status}`),
        { status: res.status },
      );
    }
  } finally {
    clearTimeout(timer);
  }

  return {
    transaction: payload.transaction,
    network_passphrase: payload.network_passphrase || networkPassphrase,
    web_auth_endpoint: webAuthEndpoint,
  };
}

/**
 * Submits a signed SEP-10 challenge transaction and returns the resulting JWT.
 */
export async function submitWebAuthChallenge(signedTransaction: string): Promise<{ token: string }> {
  const { webAuthEndpoint } = await resolveAnchor();
  if (!webAuthEndpoint) {
    throw Object.assign(
      new Error('Anchor does not advertise a SEP-10 WEB_AUTH_ENDPOINT'),
      { status: 501 },
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let payload: any;
  try {
    const res = await fetch(webAuthEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ transaction: signedTransaction }).toString(),
      signal: controller.signal,
    });
    payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.token) {
      throw Object.assign(
        new Error(payload?.error || payload?.message || `SEP-10 authentication failed with status ${res.status}`),
        { status: res.status || 500 },
      );
    }
  } finally {
    clearTimeout(timer);
  }

  return { token: payload.token };
}

export { WEB_AUTH_ENDPOINT_CACHE_TTL_MS };