# Reflex local demo flow

These credentials are for the local development database only.

## Backend

`http://localhost:5000`

## Dispatcher

- Email: `dispatcher@reflex.test`
- Password: `Reflex123!`

## Rider

- Email: `rider@reflex.test`
- Password: `Rider123!`

## End-to-end verification

1. Start the Reflex backend on `http://localhost:5000` and the Control Room frontend/proxy.
2. Open the Control Room.
3. Open **Dispatcher Portal**.
4. Sign in with the dispatcher demo credentials.
5. Open the **Dispatcher** assignment desk.
6. Select a delivery whose live status is `PENDING`.
7. Select **Bob Rider** from the live rider directory. The rider ID is resolved from the database; it is not hard-coded in the UI.
8. Click **Assign rider**.
9. Confirm the delivery changes from `PENDING` to `ASSIGNED`.
10. Open **Rider Portal**.
11. Sign in with `rider@reflex.test` / `Rider123!`.
12. Open the assigned delivery.
13. Click **Picked Up** and wait for the live response/refresh.
14. Click **Delivered**.
15. Confirm the final delivery status is `DELIVERED`.

## API contract used by the frontend

- `POST /api/v1/auth/login` — dispatcher and rider authentication.
- `GET /api/v1/deliveries` — live delivery records scoped by authenticated role.
- `PATCH /api/v1/deliveries/:id/assign` — dispatcher assigns a real rider ID to a real delivery ID.
- `PATCH /api/v1/deliveries/:id/status` — assigned rider advances `ASSIGNED → PICKED_UP → DELIVERED`.

The backend source remains unchanged. The Control Room adds only a same-origin `/api/v1/riders` proxy that resolves the configured demo rider's real database ID through backend authentication and live rider delivery data.
