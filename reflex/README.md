# Reflex

Frontend and backend application for the Reflex Readiness Sprint.

## Frontend

The production frontend lives directly in `reflex/frontend` so Render can use that directory as the service root without an extra nested `Frontend` directory.

### Render

- Root Directory: `reflex/frontend`
- Build Command: `npm install && npm run build`
- Publish Directory: `dist`
- API: set `VITE_API_BASE_URL` to the deployed Reflex backend API URL.
