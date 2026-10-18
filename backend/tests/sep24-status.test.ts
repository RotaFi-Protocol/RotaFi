import { isTerminalSep24Status } from '../src/services/sep24';

describe('isTerminalSep24Status', () => {
  it.each(['completed', 'refunded', 'expired', 'no_market', 'too_small', 'too_large', 'error'])(
    'treats %s as terminal',
    (status) => {
      expect(isTerminalSep24Status(status)).toBe(true);
    },
  );

  it.each([
    'pending_external',
    'pending_anchor',
    'pending_stellar',
    'pending_user_transfer_start',
    'incomplete',
    undefined,
    '',
  ])('treats %s as still in progress', (status) => {
    expect(isTerminalSep24Status(status)).toBe(false);
  });
});
