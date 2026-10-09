import { createHash } from 'crypto';
import {
  commitmentDigest,
  deriveSeed,
  determineWinner,
  seedToIndex,
  sortAddresses,
} from '../src/randomness';
import { determinePayoutRecipient } from '../src/watchers';
import { VaultState } from '../src/types';

describe('randomness: sortAddresses', () => {
  it('sorts "G" addresses by raw key bytes', () => {
    const low = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const high = 'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCJZM';
    expect(sortAddresses([high, low])).toEqual([low, high]);
  });

  it('groups account addresses before contract addresses', () => {
    const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const contract = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2XM';
    expect(sortAddresses([contract, account])).toEqual([account, contract]);
  });

  it('returns a sorted copy, leaving the input untouched', () => {
    const a = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const b = 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBR4XH';
    const input = [b, a];
    const sorted = sortAddresses(input);
    expect(sorted).toEqual([a, b]);
    expect(input).toEqual([b, a]);
  });
});

describe('randomness: commitmentDigest', () => {
  it('matches the documented sha256 layout', () => {
    const contractId = 'CBIHUJSOA4GSVSLFENQRJAPFUUWHPR5DXIU6H3HEMQU4XQU5EJQHL4MO';
    const member = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
    const round = 3;
    const secret = '11'.repeat(32);
    const roundBuf = Buffer.alloc(4);
    roundBuf.writeUInt32BE(round);
    const expected = createHash('sha256')
      .update(
        Buffer.concat([
          Buffer.from(contractId, 'utf8'),
          Buffer.from(member, 'utf8'),
          roundBuf,
          Buffer.from(secret, 'hex'),
        ]),
      )
      .digest('hex');
    expect(commitmentDigest({ contractId, member, round, secret })).toBe(expected);
  });

  it('is stable for identical inputs', () => {
    const input = {
      contractId: 'CAB',
      member: 'GAB',
      round: 1,
      secret: 'ff'.repeat(32),
    };
    expect(commitmentDigest(input)).toBe(commitmentDigest(input));
    expect(commitmentDigest(input)).toHaveLength(64);
  });
});

describe('randomness: deriveSeed', () => {
  const ledger = { sequence: 123456, timestamp: 1_700_000_000, networkId: 'ab'.repeat(32) };

  it('is deterministic for identical inputs', () => {
    const openings = ['01'.repeat(32), '02'.repeat(32)];
    expect(deriveSeed(openings, ledger)).toBe(deriveSeed(openings, ledger));
  });

  it('changes when openings change', () => {
    const a = deriveSeed(['01'.repeat(32)], ledger);
    const b = deriveSeed(['02'.repeat(32)], ledger);
    expect(a).not.toBe(b);
  });

  it('changes when ledger data changes', () => {
    const openings = ['01'.repeat(32)];
    const a = deriveSeed(openings, ledger);
    const b = deriveSeed(openings, { ...ledger, sequence: ledger.sequence + 1 });
    expect(a).not.toBe(b);
  });
});

describe('randomness: seedToIndex', () => {
  it('returns a stable index within range', () => {
    const seed = 'f0'.repeat(32);
    const index = seedToIndex(seed, 4);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(4);
    expect(seedToIndex(seed, 4)).toBe(index);
  });

  it('maps to the leading 8 bytes modulo len', () => {
    const head = BigInt(`0x${'f0'.repeat(8)}`);
    const index = seedToIndex('f0'.repeat(32), 10);
    expect(index).toBe(Number(head % BigInt(10)));
  });

  it('returns 0 for empty pools', () => {
    expect(seedToIndex('00'.repeat(32), 0)).toBe(0);
  });
});

describe('randomness: determineWinner', () => {
  const eligible = [
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
    'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBR4XH',
    'GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCJZM',
  ];

  it('always picks an eligible member', () => {
    const draw = {
      eligible,
      openings: ['01'.repeat(32), '02'.repeat(32), '03'.repeat(32)],
      ledger: { sequence: 1, timestamp: 2, networkId: '00'.repeat(32) },
    };
    const winner = determineWinner(draw);
    expect(eligible).toContain(winner);
  });

  it('is independent of the eligible array order', () => {
    const ledger = { sequence: 1, timestamp: 2, networkId: '00'.repeat(32) };
    const openings = ['01'.repeat(32), '02'.repeat(32), '03'.repeat(32)];
    const a = determineWinner({ eligible, openings, ledger });
    const b = determineWinner({ eligible: [...eligible].reverse(), openings, ledger });
    expect(a).toBe(b);
  });

  it('returns null when no member is eligible', () => {
    expect(
      determineWinner({ eligible: [], openings: [], ledger: { sequence: 1, timestamp: 1, networkId: '00'.repeat(32) } }),
    ).toBeNull();
  });
});

describe('watcher: determinePayoutRecipient', () => {
  const vault = {
    circle_id: 1,
    current_round: 1,
    member_count: 3,
    members_paid_current_round: 3,
    round_start_time: 1_700_000_000,
    total_rounds: 3,
    member_cap: 3,
    round_length_seconds: 600,
    grace_period_seconds: 300,
    state: 'Active' as const,
    config: {
      circle_id: 1,
      token_address: 'CBUSYNQKASUYFWYC3M2GUEDMX4AIVWPALDBYJPNK6554BREHTGZ2IUNF',
      contribution_per_member: '100000000',
      member_cap: 3,
      total_rounds: 3,
      min_collateral: '50000000',
      round_length_seconds: 600,
      grace_period_seconds: 300,
    },
  } as VaultState;

  it('derives the on-chain winner from the draw inputs', () => {
    const draw = {
      eligible: [
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBR4XH',
      ],
      openings: ['01'.repeat(32), '02'.repeat(32)],
      ledger: { sequence: 1, timestamp: 2, networkId: '00'.repeat(32) },
    };
    const winner = determinePayoutRecipient(vault, draw);
    expect(winner).not.toBeNull();
    expect(draw.eligible).toContain(winner);
  });

  it('returns null when openings count does not match eligible count', () => {
    const draw = {
      eligible: [
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
        'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBR4XH',
      ],
      openings: ['01'.repeat(32)],
      ledger: { sequence: 1, timestamp: 2, networkId: '00'.repeat(32) },
    };
    expect(determinePayoutRecipient(vault, draw)).toBeNull();
  });

  it('returns null for an empty vault', () => {
    const draw = {
      eligible: [],
      openings: [],
      ledger: { sequence: 1, timestamp: 2, networkId: '00'.repeat(32) },
    };
    expect(determinePayoutRecipient({ ...vault, member_count: 0 }, draw)).toBeNull();
  });
});