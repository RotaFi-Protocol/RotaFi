title: "[Backend] Add zod input validation on all POST routes"
labels: backend

## Task

Add zod schemas and a validation middleware to all POST routes.

## Routes to cover

- `POST /api/circles/create` — validate `member_cap` (2-20), `contribution_amount` (>0), `round_duration_ledgers` (>=120)
- `POST /api/circles/:id/join` — validate address is a valid Stellar address

## Acceptance Criteria

- Invalid inputs return 400 with descriptive error messages
- Valid inputs pass through unchanged

## Files

`backend/src/middleware/validate.ts` (create)
`backend/src/routes/circles.ts` (update)
