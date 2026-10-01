title: "[Contract] Add unit tests for ReputationRegistry scoring logic"
labels: contract,good-first-issue

## Task

Add unit tests for ReputationRegistry covering:
- [ ] Score increases on successful round completion
- [ ] Score decreases on missed contribution
- [ ] Score floor at 0 (no negative scores)
- [ ] `get_score` returns correct value after multiple updates

## Acceptance Criteria

- All 4 test cases passing
- No existing tests broken

## Files

`contract/reputation-registry/src/lib.rs`
