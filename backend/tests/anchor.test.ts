import request from 'supertest';
import app from '../src/index';

jest.mock('../src/services/sep24', () => ({
  getSep24Info: jest.fn(),
  getSep24AssetInfo: jest.fn(),
  getSep24Transaction: jest.fn(),
  isTerminalSep24Status: jest.fn((status?: string) =>
    ['completed', 'refunded', 'expired', 'no_market', 'too_small', 'too_large', 'error'].includes(
      status || '',
    ),
  ),
  startSep24Deposit: jest.fn(),
  startSep24Withdrawal: jest.fn(),
  listDepositAssets: jest.fn(),
  resolveAnchor: jest.fn(),
}));

jest.mock('../src/services/sep10', () => ({
  getWebAuthChallenge: jest.fn(),
  submitWebAuthChallenge: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const sep24 = require('../src/services/sep24');
const sep10 = require('../src/services/sep10');

const ACCOUNT = 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47';

describe('SEP-24 Anchor API', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    sep24.resolveAnchor.mockResolvedValue({
      homeDomain: 'testanchor.stellar.org',
      transferServer: 'https://testanchor.stellar.org/sep24',
      webAuthEndpoint: 'https://testanchor.stellar.org/auth',
      networkPassphrase: 'Test SDF Network ; September 2015',
      signingKey: 'GCHLH...33PR',
    });

    sep24.getSep24Info.mockResolvedValue({
      deposit: { USDC: { enabled: true, min_amount: 1, max_amount: 10 }, SRT: { enabled: false } },
      withdraw: { USDC: { enabled: true, min_amount: 1, max_amount: 10 } },
    });

    sep24.listDepositAssets.mockResolvedValue(['USDC']);

    sep24.getSep24AssetInfo.mockResolvedValue({
      assetCode: 'USDC',
      depositEnabled: true,
      withdrawEnabled: true,
      minAmount: 1,
      maxAmount: 10,
    });
  });

  describe('GET /info', () => {
    it('returns anchor info, auth requirement and asset metadata', async () => {
      const res = await request(app).get('/api/v1/anchors/info');
      expect(res.status).toBe(200);
      expect(res.body.home_domain).toBe('testanchor.stellar.org');
      expect(res.body.transfer_server).toBe('https://testanchor.stellar.org/sep24');
      expect(res.body.auth_required).toBe(true);
      expect(res.body.default_asset).toBe('USDC');
      expect(res.body.assets).toEqual([
        {
          code: 'USDC',
          deposit: { enabled: true, min_amount: 1, max_amount: 10 },
          withdraw: { enabled: true, min_amount: 1, max_amount: 10 },
        },
      ]);
    });

    it('returns 502 when the anchor is unreachable', async () => {
      sep24.resolveAnchor.mockRejectedValue(new Error('ECONNREFUSED'));
      const res = await request(app).get('/api/v1/anchors/info');
      expect(res.status).toBe(502);
      expect(res.body.error).toBe('Failed to reach SEP-24 anchor');
    });
  });

  describe('GET /assets/:code', () => {
    it('returns the deposit/withdraw limits for an asset', async () => {
      const res = await request(app).get('/api/v1/anchors/assets/USDC');
      expect(res.status).toBe(200);
      expect(res.body.assetCode).toBe('USDC');
      expect(res.body.depositEnabled).toBe(true);
    });
  });

  describe('SEP-10 auth', () => {
    it('GET /auth/challenge validates the account address', async () => {
      const res = await request(app).get('/api/v1/anchors/auth/challenge?account=bad');
      expect(res.status).toBe(400);
    });

    it('GET /auth/challenge returns a challenge to sign', async () => {
      sep10.getWebAuthChallenge.mockResolvedValue({
        transaction: 'AAAAA...',
        network_passphrase: 'Test SDF Network ; September 2015',
        web_auth_endpoint: 'https://testanchor.stellar.org/auth',
      });
      const res = await request(app).get(
        `/api/v1/anchors/auth/challenge?account=${ACCOUNT}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.transaction).toBe('AAAAA...');
    });

    it('POST /auth returns a JWT after the wallet signs', async () => {
      sep10.submitWebAuthChallenge.mockResolvedValue({ token: 'jwt-token' });
      const res = await request(app)
        .post('/api/v1/anchors/auth')
        .send({ transaction: 'SIGNED-XDR' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBe('jwt-token');
    });

    it('POST /auth validates the transaction field', async () => {
      const res = await request(app).post('/api/v1/anchors/auth').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /deposit', () => {
    it('validates the request body', async () => {
      const res = await request(app).post('/api/v1/anchors/deposit').send({});
      expect(res.status).toBe(400);
    });

    it('rejects assets the anchor does not support', async () => {
      sep24.getSep24AssetInfo.mockResolvedValue({
        assetCode: 'SRT',
        depositEnabled: false,
        withdrawEnabled: false,
      });
      const res = await request(app).post('/api/v1/anchors/deposit').send({
        asset_code: 'SRT',
        account: ACCOUNT,
      });
      expect(res.status).toBe(400);
    });

    it('starts an interactive deposit and returns the popup url', async () => {
      sep24.startSep24Deposit.mockResolvedValue({
        id: 'txn-1',
        url: 'https://testanchor.stellar.org/sep24/interactive?token=abc',
        type: 'interactive_customer_info_needed',
      });
      const res = await request(app).post('/api/v1/anchors/deposit').send({
        asset_code: 'USDC',
        account: ACCOUNT,
        amount: '5',
      });
      expect(res.status).toBe(202);
      expect(res.body.id).toBe('txn-1');
      expect(res.body.url).toContain('interactive');
      expect(res.body.status).toBe('incomplete');
      expect(sep24.startSep24Deposit).toHaveBeenCalledWith(
        { assetCode: 'USDC', account: ACCOUNT, amount: '5', memo: undefined, lang: undefined },
        undefined,
      );
    });
  });

  describe('POST /withdraw', () => {
    it('starts an interactive withdrawal with a destination', async () => {
      sep24.startSep24Withdrawal.mockResolvedValue({
        id: 'txn-2',
        url: 'https://testanchor.stellar.org/sep24/interactive?token=xyz',
        type: 'interactive_customer_info_needed',
      });
      const res = await request(app).post('/api/v1/anchors/withdraw').send({
        asset_code: 'USDC',
        account: ACCOUNT,
        amount: '25',
      });
      expect(res.status).toBe(202);
      expect(res.body.id).toBe('txn-2');
      expect(sep24.startSep24Withdrawal).toHaveBeenCalledWith(
        { assetCode: 'USDC', account: ACCOUNT, amount: '25', dest: undefined, memo: undefined, lang: undefined },
        undefined,
      );
    });

    it('forwards the Bearer token to the anchor', async () => {
      sep24.startSep24Withdrawal.mockResolvedValue({
        id: 'txn-3',
        url: 'https://example.test/interactive',
        type: 'interactive_customer_info_needed',
      });
      const res = await request(app)
        .post('/api/v1/anchors/withdraw')
        .set('Authorization', 'Bearer jwt-123')
        .send({ asset_code: 'USDC', account: ACCOUNT, amount: '5' });
      expect(res.status).toBe(202);
      expect(sep24.startSep24Withdrawal).toHaveBeenCalledWith(
        expect.any(Object),
        'jwt-123',
      );
    });
  });

  describe('GET /transactions/:id', () => {
    it('returns transaction status with terminal/succeeded flags', async () => {
      sep24.getSep24Transaction.mockResolvedValue({
        id: 'txn-1',
        status: 'completed',
        amount_in: '5',
        amount_out: '4.9',
      });
      const res = await request(app).get('/api/v1/anchors/transactions/txn-1');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body.terminal).toBe(true);
      expect(res.body.succeeded).toBe(true);
    });

    it('marks failed transactions as terminal but not succeeded', async () => {
      sep24.getSep24Transaction.mockResolvedValue({ id: 'txn-1', status: 'error' });
      const res = await request(app).get('/api/v1/anchors/transactions/txn-1');
      expect(res.body.terminal).toBe(true);
      expect(res.body.succeeded).toBe(false);
    });

    it('validates the transaction id', async () => {
      const res = await request(app).get('/api/v1/anchors/transactions/');
      expect([404, 400]).toContain(res.status);
    });
  });
});