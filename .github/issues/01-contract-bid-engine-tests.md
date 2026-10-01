title: "[Contract] Add unit tests for BidEngine sealed-bid auction logic"
labels: contract,good-first-issue

## Task

Add unit tests for the BidEngine contract covering:
- [ ] Sealed bid submission and reveal
- [ ] Correct winner selection (highest bid wins earlier round)
- [ ] Bid refund on non-winning bids
- [ ] Double-bid prevention

## Acceptance Criteria

- All 4 test cases passing under `cargo test`
- No existing tests broken

## Files

`contract/bid-engine/src/lib.rs` — add `#[cfg(test)]` module
