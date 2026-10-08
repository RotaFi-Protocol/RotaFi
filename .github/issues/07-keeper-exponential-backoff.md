title: "[Keeper] Replace fixed retry delay with exponential backoff"
labels: keeper,good-first-issue

## Task

Replace fixed delay retries with exponential backoff on Soroban RPC calls.

## Spec

- Initial delay: 1000ms
- Multiplier: 2x per attempt
- Max attempts: 5
- Max delay: 30000ms
- Log each retry with attempt number and delay

## Acceptance Criteria

- Unit test: mock 3 failed attempts then 1 success
- No infinite loops
- Existing keeper tests still pass

## Files

`keeper/src/stellar.ts`
