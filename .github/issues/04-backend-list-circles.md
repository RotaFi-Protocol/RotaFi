title: "[Backend] Add GET /api/circles endpoint with pagination"
labels: backend,good-first-issue

## Task

Add a `GET /api/circles` endpoint that returns all active circles from the CircleFactory contract.

## Response shape

```json
{
  "circles": [{
    "id": 1,
    "owner": "G...",
    "member_cap": 10,
    "contribution_amount": 10000000,
    "round_duration_ledgers": 17280,
    "current_round": 2,
    "status": "Active"
  }],
  "total": 12,
  "page": 1
}
```

## Acceptance Criteria

- Supports `?page=` and `?limit=` query params
- Returns empty array (not 500) when no circles exist

## Files

`backend/src/routes/circles.ts`
