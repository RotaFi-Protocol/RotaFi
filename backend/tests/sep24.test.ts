import { isTerminalSep24Status } from '../src/services/sep24';

describe('isTerminalSep24Status', () => {
  it('returns true for completed', () => {
    expect(isTerminalSep24Status('completed')).toBe(true);
  });

  it('returns true for refunded', () => {
    expect(isTerminalSep24Status('refunded')).toBe(true);
  });

  it('returns true for expired', () => {
    expect(isTerminalSep24Status('expired')).toBe(true);
  });

  it('returns true for no_market', () => {
    expect(isTerminalSep24Status('no_market')).toBe(true);
  });

  it('returns true for too_small', () => {
    expect(isTerminalSep24Status('too_small')).toBe(true);
  });

  it('returns true for too_large', () => {
    expect(isTerminalSep24Status('too_large')).toBe(true);
  });

  it('returns true for error', () => {
    expect(isTerminalSep24Status('error')).toBe(true);
  });

  it('returns false for pending_external (mutable)', () => {
    expect(isTerminalSep24Status('pending_external')).toBe(false);
  });

  it('returns false for unknown status', () => {
    expect(isTerminalSep24Status('incomplete')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTerminalSep24Status(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isTerminalSep24Status('')).toBe(false);
  });
});
