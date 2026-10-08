title: "[Frontend] Build /circles page with circle browser"
labels: frontend

## Task

Build a public `/circles` page listing all active RotaFi circles from the backend.

## UI Spec

- Grid of CircleCard components
- Each card: member cap, contribution amount, current round, status badge, Join button
- Empty state if no circles
- Loading skeleton while fetching
- No wallet required to browse

## Acceptance Criteria

- Renders at `/circles`
- Cards link to `/circles/:id`
- Works on mobile (min 375px)

## Files

`frontend/src/app/circles/page.tsx`
`frontend/src/components/circle/CircleCard.tsx`
