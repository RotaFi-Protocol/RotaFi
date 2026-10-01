# Contributor Backlog Reference

Source of truth for the 14 starter issues tracked for RotaFi v0.1.0.

The 15th issue in the original backlog (add `SECURITY.md`) is intentionally absent — it was already delivered by PR `chore/add-security-md`.

Each file in this directory holds the title, labels, and body of one issue. To publish them as live GitHub issues after this PR is merged:

```bash
for f in .github/issues/[0-9]*.md; do
  gh issue create --repo RotaFi-Protocol/RotaFi \
    --title "$(sed -n '1s/^title: //p' "$f")" \
    --label "$(sed -n '2s/^labels: //p' "$f")" \
    --body "$(sed '1,2d' "$f")"
done
```

| # | Issue | Labels |
|---|---|---|
| 01 | Add unit tests for BidEngine sealed-bid auction logic | `contract`, `good-first-issue` |
| 02 | Add unit tests for ReputationRegistry scoring logic | `contract`, `good-first-issue` |
| 03 | Emit CollateralSlash event in ContributionVault | `contract` |
| 04 | Add `GET /api/circles` endpoint with pagination | `backend`, `good-first-issue` |
| 05 | Add `GET /api/reputation/:address` endpoint | `backend`, `good-first-issue` |
| 06 | Add zod input validation on all POST routes | `backend` |
| 07 | Replace fixed retry delay with exponential backoff | `keeper`, `good-first-issue` |
| 08 | Add `/metrics` endpoint with execution counts | `keeper` |
| 09 | Build `/circles` page with circle browser | `frontend` |
| 10 | Build `/circles/new` create circle form | `frontend` |
| 11 | Add live ledger clock to navbar | `frontend`, `good-first-issue` |
| 12 | Write ContributionVault contract reference page | `docs`, `good-first-issue` |
| 13 | Write keeper self-hosting guide | `docs`, `good-first-issue` |
| 14 | Write full REST API reference page | `docs` |
