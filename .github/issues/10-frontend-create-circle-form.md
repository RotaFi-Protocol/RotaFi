title: "[Frontend] Build /circles/new create circle form"
labels: frontend

## Task

Build the `/circles/new` page with a form that calls CircleFactory to create a new circle.

## Form fields

- Member Cap (number, 2-20)
- Contribution Amount in USDC (min 1)
- Round Duration (select: 1 Day / 1 Week / 1 Month / Custom)
- Label (text, max 64 chars)
- Preview: shows total pot size and estimated duration

## Acceptance Criteria

- Requires Freighter wallet connected
- Calls `create_circle` on CircleFactory via Freighter
- Shows TX hash toast on success
- Form validates before submitting

## Files

`frontend/src/app/circles/new/page.tsx`
`frontend/src/components/circle/CreateCircleForm.tsx`
