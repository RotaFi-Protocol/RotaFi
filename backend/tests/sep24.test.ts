import { isTerminalSep24Status } from '../src/services/sep24';

describe('isTerminalSep24Status', () => {
  it('returns true for terminal statuses', () => {
    for (const status of ['completed', 'refunded', 'expired', 'no_market', 'too_small', 'too_large', 'error']) {
      expect(isTerminalSep24Status(status)).toBe(true);
    }
  });

  it('returns false for non-terminal (mutable) statuses', () => {
    for (const status of ['pending_external', 'pending_user_transfer_start', 'incomplete', 'pending_anchor', undefined, '']) {
      expect(isTerminalSep24Status(status)).toBe(false);
    }
  });
});
