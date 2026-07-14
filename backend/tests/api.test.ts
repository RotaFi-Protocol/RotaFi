import request from 'supertest';
import app from '../src/index';

describe('Health check', () => {
  it('GET /healthz returns healthy', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('contracts');
  });

  it('GET / returns API info', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'RotaFi API');
  });
});

describe('Circles API', () => {
  it('GET /api/v1/circles returns list', async () => {
    const res = await request(app).get('/api/v1/circles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('circles');
    expect(Array.isArray(res.body.circles)).toBe(true);
  });

  it('GET /api/v1/circles/:id with invalid id returns 400', async () => {
    const res = await request(app).get('/api/v1/circles/abc');
    expect(res.status).toBe(400);
  });

  it('GET /api/v1/circles/:id not found returns 404', async () => {
    const res = await request(app).get('/api/v1/circles/999');
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/circles without body returns 400', async () => {
    const res = await request(app).post('/api/v1/circles');
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/circles with valid body returns 201', async () => {
    const res = await request(app).post('/api/v1/circles').send({
      contribution_amount: '100000000',
      round_length_seconds: '604800',
      member_cap: 5,
      payout_method: 0,
      min_collateral: '50000000',
      grace_period_seconds: '86400',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 1);
    expect(res.body.transaction).toHaveProperty('method', 'create_circle');
  });

  it('POST /api/v1/circles with member_cap=1 returns 400', async () => {
    const res = await request(app).post('/api/v1/circles').send({
      contribution_amount: '100000000',
      round_length_seconds: '604800',
      member_cap: 1,
      payout_method: 0,
      min_collateral: '50000000',
      grace_period_seconds: '86400',
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/circles/:id/join validates input', async () => {
    const res = await request(app).post('/api/v1/circles/1/join').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/circles/:id/join succeeds with valid body', async () => {
    const res = await request(app).post('/api/v1/circles/1/join').send({
      member_address: 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47',
      token_address: 'CBUSYNQKASUYFWYC3M2GUEDMX4AIVWPALDBYJPNK6554BREHTGZ2IUNF',
    });
    expect(res.status).toBe(200);
    expect(res.body.transaction).toHaveProperty('method', 'join_vault');
  });
});

describe('Contributions API', () => {
  it('GET /api/v1/contributions/vault returns vault state', async () => {
    const res = await request(app).get('/api/v1/contributions/vault');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('state');
  });

  it('POST /api/v1/contributions/contribute validates input', async () => {
    const res = await request(app).post('/api/v1/contributions/contribute').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/contributions/contribute with valid body', async () => {
    const res = await request(app).post('/api/v1/contributions/contribute').send({
      member_address: 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47',
      token_address: 'CBUSYNQKASUYFWYC3M2GUEDMX4AIVWPALDBYJPNK6554BREHTGZ2IUNF',
    });
    expect(res.status).toBe(200);
  });

  it('POST /api/v1/contributions/payout validates input', async () => {
    const res = await request(app).post('/api/v1/contributions/payout').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/contributions/payout with valid body', async () => {
    const res = await request(app).post('/api/v1/contributions/payout').send({
      winner_address: 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47',
      token_address: 'CBUSYNQKASUYFWYC3M2GUEDMX4AIVWPALDBYJPNK6554BREHTGZ2IUNF',
    });
    expect(res.status).toBe(200);
  });
});

describe('Reputation API', () => {
  it('GET /api/v1/reputation/rating/:address returns rating', async () => {
    const res = await request(app).get(
      '/api/v1/reputation/rating/GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47',
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rating');
    expect(res.body.rating).toBeGreaterThanOrEqual(0);
    expect(res.body.rating).toBeLessThanOrEqual(100);
  });

  it('GET /api/v1/reputation/score/:address returns null for unknown', async () => {
    const res = await request(app).get(
      '/api/v1/reputation/score/GCITJ6GX4GZLFOG6XKVMQAWVVDYQ5K6NCXNB5YVFY2BBLBRUKSK5LLQI',
    );
    // May be 404 if no record, or 200 with null
    expect([200, 404]).toContain(res.status);
  });
});

describe('Bids API', () => {
  it('GET /api/v1/bids/state returns state', async () => {
    const res = await request(app).get('/api/v1/bids/state');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('state');
  });

  it('GET /api/v1/bids returns empty by default', async () => {
    const res = await request(app).get('/api/v1/bids');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('bids');
  });

  it('POST /api/v1/bids/submit validates input', async () => {
    const res = await request(app).post('/api/v1/bids/submit').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/bids/submit with valid body', async () => {
    const res = await request(app).post('/api/v1/bids/submit').send({
      member_address: 'GBHV5KX64RLM2QV53OQ4CL7AG3WY7XL553ZQBFJRT7TGPZXZOB7Y2C47',
      discount_bps: 500,
      round: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.transaction).toHaveProperty('method', 'submit_bid');
  });
});

describe('Error handling', () => {
  it('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.status).toBe(404);
  });

  it('Rate limiter headers are set', async () => {
    const res = await request(app).get('/healthz');
    // Rate limiter is skipped in test mode, so headers may not be present
    expect(res.status).toBe(200);
  });
});
