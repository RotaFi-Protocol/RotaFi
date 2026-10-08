title: "[Docs] Write full REST API reference page"
labels: docs

## Task

Write the REST API reference documentation page for all backend endpoints.

## Must cover every endpoint

- `GET /healthz`
- `GET /api/stats`
- `GET /api/circles`
- `GET /api/circles/:id`
- `GET /api/circles/:id/members`
- `GET /api/circles/:id/rounds`
- `GET /api/reputation/:address`

## Format per endpoint

- Method + path, description, query params, example response JSON

## Files

`docs/src/content/docs/api/rest-api.mdx`
