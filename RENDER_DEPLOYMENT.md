# Reflex Render Deployment

## Control Room web service
Root: `.`
Build: `npm install && npm run build`
Start: `npm start`

Environment:
- `NODE_VERSION=24.20.0`
- `NODE_ENV=production`
- `VITE_API_BASE_URL=/api/v1`
- `BACKEND_API_URL=https://reflex-backend-ru4q.onrender.com`
- `FRONTEND_URL=https://reflex-control-room01.onrender.com`
- `DEMO_DISPATCHER_EMAIL` / `DEMO_DISPATCHER_PASSWORD`
- `DEMO_RIDER_EMAIL` / `DEMO_RIDER_PASSWORD`

## Backend service
Root: `reflex/backend`
Build: `npm install && npm run build`
Start: `npm start`

The demo accounts are seeded idempotently at backend startup when the four `DEMO_*` variables are configured. Passwords must never be committed to GitHub.

## Acceptance flow
Dispatcher signs in, selects a pending delivery, selects an available rider by real database ID, and assigns. Rider signs in, sees only their assigned deliveries, then transitions `ASSIGNED -> PICKED_UP -> DELIVERED`. Refreshing preserves the JWT session; signing out removes it.
