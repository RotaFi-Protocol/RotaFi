title: "[Backend] Add GET /api/reputation/:address endpoint"
labels: backend,good-first-issue

## Task

Add `GET /api/reputation/:address` that reads a Stellar address's reputation score from the ReputationRegistry contract.

## Response shape

```json
{
  "address": "G...",
  "score": 847,
  "circles_completed": 3,
  "rounds_missed": 0
}
```

## Acceptance Criteria

- Returns 404 if address has no reputation entry
- Returns 400 if address is not a valid Stellar address

## Files

`backend/src/routes/reputation.ts`
