title: "[Keeper] Add /metrics endpoint with execution counts"
labels: keeper

## Task

Add an HTTP `/metrics` endpoint to the keeper's health server.

## Response shape

```json
{
  "rounds_advanced": 12,
  "slashes_executed": 2,
  "rpc_errors": 1,
  "poll_cycles": 480,
  "uptime_seconds": 14400
}
```

## Acceptance Criteria

- Endpoint responds at `GET /metrics`
- Counts are in-memory (reset on restart is fine)

## Files

`keeper/src/metrics.ts` (create)
`keeper/src/index.ts` (wire in)
