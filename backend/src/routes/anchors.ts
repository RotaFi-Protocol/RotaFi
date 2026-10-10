import { Router, Request, Response } from 'express';
import { strictLimiter } from '../middleware/rateLimiter';
import {
  anchorAuthChallengeSchema,
  anchorAuthSubmitSchema,
  anchorDepositSchema,
  anchorWithdrawSchema,
  anchorTransactionParamsSchema,
} from '../middleware/validation';
import {
  getSep24AssetInfo,
  getSep24Info,
  getSep24Transaction,
  isTerminalSep24Status,
  startSep24Deposit,
  startSep24Withdrawal,
  listDepositAssets,
  resolveAnchor,
} from '../services/sep24';
import { getWebAuthChallenge, submitWebAuthChallenge } from '../services/sep10';
import { config } from '../config';

const router = Router();

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice('Bearer '.length).trim() || undefined;
}

/**
 * Anchor discovery + SEP-24 asset metadata. The frontend uses this to render
 * the fiat ramp options (USDC/EURC/...) and to detect SEP-10 sign-in.
 */
router.get('/info', async (_req: Request, res: Response) => {
  try {
    const anchor = await resolveAnchor();
    const [info, depositAssets] = await Promise.all([getSep24Info(), listDepositAssets()]);
    const assets = depositAssets.map((code) => ({ code })).map(({ code }) => ({
      code,
      deposit: createAssetView('deposit', info, code),
      withdraw: createAssetView('withdraw', info, code),
    }));

    res.json({
      home_domain: anchor.homeDomain,
      transfer_server: anchor.transferServer,
      network_passphrase: anchor.networkPassphrase,
      web_auth_endpoint: anchor.webAuthEndpoint,
      auth_required: Boolean(anchor.webAuthEndpoint),
      default_asset: config.anchor.defaultAsset,
      assets,
    });
  } catch (error: any) {
    const status = error.status || 502;
    res.status(status).json({
      error: 'Failed to reach SEP-24 anchor',
      message: error.message,
    });
  }
});

/**
 * (Optional) per-asset metadata. Kept as a separate endpoint so wallet UIs can
 * show min/max amounts and step fees before a transfer is started.
 */
router.get('/assets/:code', async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code);
    const asset = await getSep24AssetInfo(code);
    res.json(asset);
  } catch (error: any) {
    res.status(error.status || 502).json({ error: 'Failed to load asset info', message: error.message });
  }
});

/** SEP-10: request a challenge transaction for the connected wallet to sign. */
router.get('/auth/challenge', async (req: Request, res: Response) => {
  const parsed = anchorAuthChallengeSchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', message: parsed.error.message });
  }
  try {
    const challenge = await getWebAuthChallenge(parsed.data.account);
    res.json(challenge);
  } catch (error: any) {
    res.status(error.status || 502).json({ error: 'Failed to fetch SEP-10 challenge', message: error.message });
  }
});

/**
 * SEP-10: submit a signed challenge transaction and receive a JWT. The JWT is
 * handed back to the client, which passes it as `Authorization: Bearer` on
 * subsequent deposit/withdraw calls.
 */
router.post('/auth', strictLimiter, async (req: Request, res: Response) => {
  const parsed = anchorAuthSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', message: parsed.error.message });
  }
  try {
    const { token } = await submitWebAuthChallenge(parsed.data.transaction);
    res.json({ token });
  } catch (error: any) {
    res.status(error.status || 502).json({ error: 'SEP-10 authentication failed', message: error.message });
  }
});

/** Starts an interactive SEP-24 deposit (fiat on-ramp to fund contributions). */
router.post('/deposit', strictLimiter, async (req: Request, res: Response) => {
  const parsed = anchorDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', message: parsed.error.message });
  }
  try {
    const asset = await getSep24AssetInfo(parsed.data.asset_code);
    if (!asset.depositEnabled) {
      return res.status(400).json({
        error: `Asset ${parsed.data.asset_code} does not support SEP-24 deposits via this anchor`,
      });
    }
    const transfer = await startSep24Deposit(
      {
        assetCode: parsed.data.asset_code,
        account: parsed.data.account,
        amount: parsed.data.amount,
        memo: parsed.data.memo,
        lang: parsed.data.lang,
      },
      bearerToken(req),
    );
    res.status(202).json({
      id: transfer.id,
      url: transfer.url,
      token: transfer.token,
      asset_code: parsed.data.asset_code,
      account: parsed.data.account,
      status: 'incomplete',
    });
  } catch (error: any) {
    const status = error.status === 401 || error.status === 403 ? 401 : error.status || 502;
    res.status(status).json({
      error:
        status === 401
          ? 'SEP-10 authentication required'
          : 'Failed to start SEP-24 deposit',
      message: error.message,
    });
  }
});

/** Starts an interactive SEP-24 withdrawal (fiat off-ramp to cash out a pot). */
router.post('/withdraw', strictLimiter, async (req: Request, res: Response) => {
  const parsed = anchorWithdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', message: parsed.error.message });
  }
  try {
    const asset = await getSep24AssetInfo(parsed.data.asset_code);
    if (!asset.withdrawEnabled) {
      return res.status(400).json({
        error: `Asset ${parsed.data.asset_code} does not support SEP-24 withdrawals via this anchor`,
      });
    }
    const transfer = await startSep24Withdrawal(
      {
        assetCode: parsed.data.asset_code,
        account: parsed.data.account,
        amount: parsed.data.amount,
        dest: parsed.data.dest,
        memo: parsed.data.memo,
        lang: parsed.data.lang,
      },
      bearerToken(req),
    );
    res.status(202).json({
      id: transfer.id,
      url: transfer.url,
      token: transfer.token,
      asset_code: parsed.data.asset_code,
      account: parsed.data.account,
      status: 'incomplete',
    });
  } catch (error: any) {
    const status = error.status === 401 || error.status === 403 ? 401 : error.status || 502;
    res.status(status).json({
      error:
        status === 401
          ? 'SEP-10 authentication required'
          : 'Failed to start SEP-24 withdrawal',
      message: error.message,
    });
  }
});

/** Fetches the current status of a SEP-24 transfer (for popup polling). */
router.get('/transactions/:id', async (req: Request, res: Response) => {
  const parsed = anchorTransactionParamsSchema.safeParse({ id: req.params.id });
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request', message: parsed.error.message });
  }
  try {
    const tx = await getSep24Transaction(parsed.data.id, bearerToken(req));
    res.json({
      ...tx,
      terminal: isTerminalSep24Status(tx.status),
      succeeded: tx.status === 'completed',
    });
  } catch (error: any) {
    res.status(error.status || 502).json({ error: 'Failed to fetch SEP-24 transaction', message: error.message });
  }
});

function createAssetView(
  direction: 'deposit' | 'withdraw',
  info: Awaited<ReturnType<typeof getSep24Info>>,
  code: string,
): {
  enabled: boolean;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
} {
  const asset = info?.[direction]?.[code];
  return {
    enabled: Boolean(asset?.enabled),
    min_amount: asset?.min_amount,
    max_amount: asset?.max_amount,
    fee_fixed: asset?.fee_fixed,
    fee_percent: asset?.fee_percent,
  };
}

export default router;