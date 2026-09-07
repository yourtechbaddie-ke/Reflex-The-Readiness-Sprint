# Reflex — The Readiness Sprint

Reflex is a last-mile delivery coordination prototype that replaces the WhatsApp-group-and-phone-calls workflow retailers, dispatchers, and riders currently use to track deliveries. It gives all three roles one shared, auditable system of record: a retailer creates a delivery, a dispatcher assigns a rider, and the rider updates status as the job progresses.

**Live frontend (Render prototype):** https://reflex-control-room01.onrender.com

---

## Table of Contents

- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
  - [Backend setup](#backend-setup)
  - [Frontend setup](#frontend-setup)
- [Roles & permissions](#roles--permissions)
- [Delivery status lifecycle](#delivery-status-lifecycle)
- [API reference](#api-reference)
- [Known gaps / integration notes](#known-gaps--integration-notes)
- [Testing](#testing)
- [Roadmap](#roadmap)

---

## How it works

```
Retailer creates a delivery       (status: PENDING)
        ↓
Dispatcher assigns a rider        (status: ASSIGNED)
        ↓
Rider marks it picked up          (status: PICKED_UP)
        ↓
Rider marks it delivered          (status: DELIVERED)
```

A delivery can also be `CANCELLED` from `ASSIGNED` or `PICKED_UP`. Every transition is written to an append-only history table (who changed it, and when), so there's always an audit trail — not just a chat log.

## Tech stack

**Frontend — "Reflex Control Room"**
| Technology | Purpose |
|---|---|
| React 19 | UI |
| Vite | Dev server / build |
| TypeScript | Type safety |
| Fetch API | Backend communication |

**Backend**
| Technology | Purpose |
|---|---|
| Node.js + Express 5 | REST API |
| TypeScript | Type safety |
| Prisma 7 (`@prisma/adapter-pg`) | ORM |
| PostgreSQL (via Supabase) | Database |
| jsonwebtoken | Auth tokens |
| bcryptjs | Password hashing |
| zod | Request validation |
| helmet, cors | HTTP hardening |

**Data flow:** the frontend never talks to the database directly — it only calls the backend API, which owns validation, auth, and all business logic before touching Postgres.

```
React UI  →  Frontend API client  →  Backend REST API  →  Prisma  →  PostgreSQL (Supabase)
```

## Repository structure

```
Reflex-The-Readiness-Sprint/
├── docs/
│   └── Testing, Q&A, Security and Defence Preparation.md
└── reflex/
    ├── backend/
    │   ├── prisma/
    │   │   ├── schema.prisma
    │   │   └── migrations/
    │   ├── src/
    │   │   ├── app.ts               # Express app, middleware, route mounting
    │   │   ├── server.ts            # Entry point
    │   │   ├── config/database.ts   # Prisma client / pg pool
    │   │   ├── controller/          # auth.controller.ts, delivery.controller.ts
    │   │   ├── services/            # auth.service.ts, delivery.service.ts (business logic)
    │   │   ├── routes/              # auth.routes.ts, delivery.routes.ts, health.routes.ts
    │   │   ├── middleware/          # auth, role, validate, error, not-found
    │   │   ├── schemas/             # zod request schemas
    │   │   └── utils/               # jwt.ts, response.ts
    │   └── test.http                # runnable sample requests
    └── frontend/
        ├── docs/
        │   ├── architecture.md
        │   └── frontend-ux.md
        └── Frontend/
            └── src/
                ├── api/              # apiClient.ts, deliveriesApi.ts, errors.ts
                ├── components/       # Sidebar, Topbar, DeliveryTable, StatusBadge, etc.
                ├── pages/            # Dashboard, Deliveries, MyDeliveries, Riders, Home
                ├── config/api.ts     # API base URL
                └── types/delivery.ts
```

## Getting started

### Backend setup

```bash
cd reflex/backend
npm install
```

Create a `.env` file in `reflex/backend/`:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
JWT_SECRET=<a-long-random-secret>
PORT=5000
FRONTEND_URL=http://localhost:5173
```

> `JWT_SECRET` falls back to a hardcoded dev value if unset — always set a real one outside local development.

Run migrations and start the API:

```bash
npx prisma migrate deploy   # or `prisma migrate dev` locally
npm run dev                 # starts on PORT (default 5000) via tsx watch
```

Health check: `GET http://localhost:5000/api/v1/health`

### Frontend setup

```bash
cd reflex/frontend/Frontend
npm install
```

Create a `.env` file (Vite requires the `VITE_` prefix):

```env
VITE_API_BASE_URL=https://reflex-backend-ru4q.onrender.com/api/v1
```

```bash
npm run dev       # starts the Vite dev server
npm run build     # production build
```

> **Check this before running locally:** `src/config/api.ts` currently falls back to `http://localhost:3000/api` if `VITE_API_BASE_URL` isn't set, which doesn't match the backend's actual default of `http://localhost:5000/api/v1`. Set the env var explicitly.

## Roles & permissions

Every user has exactly one role, enforced at the API layer:

| Role | Can do |
|---|---|
| `RETAILER` | Create deliveries; view their own deliveries |
| `DISPATCHER` | View all deliveries; assign a rider to a `PENDING` delivery |
| `RIDER` | View deliveries assigned to them; update status on their own deliveries |

Authorization is two-layered: `requireRole(...)` middleware gates by role, and service-level checks (e.g. `getDeliveryById`, `updateDeliveryStatus`) enforce row-level ownership so, for example, a rider can't update someone else's delivery even if they guess the ID.

## Delivery status lifecycle

```
PENDING → ASSIGNED → PICKED_UP → DELIVERED
             ↓            ↓
         CANCELLED    CANCELLED
```

Enforced server-side in `updateDeliveryStatus`:

| From | Valid next states |
|---|---|
| `ASSIGNED` | `PICKED_UP`, `CANCELLED` |
| `PICKED_UP` | `DELIVERED`, `CANCELLED` |
| `DELIVERED` | *(terminal)* |
| `CANCELLED` | *(terminal)* |

Any other transition returns `400 INVALID_STATUS_TRANSITION`.

## API reference

Base URL: `/api/v1`

### Auth

**`POST /auth/register`**
```json
{
  "name": "Peter Rider",
  "email": "retailer@reflex.test",
  "phone": "0733333333",
  "password": "password123",
  "role": "RETAILER"
}
```
Returns `201` with `{ user, token }`. `role` must be one of `RETAILER`, `DISPATCHER`, `RIDER`. `EMAIL_ALREADY_EXISTS` → `409`.

**`POST /auth/login`**
```json
{ "email": "retailer@reflex.test", "password": "password123" }
```
Returns `200` with `{ user, token }`. Bad credentials → `401 INVALID_CREDENTIALS`.

**`GET /auth/me`** — requires `Authorization: Bearer <token>`. Returns the current user's profile.

### Deliveries

All delivery routes require `Authorization: Bearer <token>`.

| Method | Route | Role | Description |
|---|---|---|---|
| `POST` | `/deliveries` | Retailer | Create a delivery |
| `GET` | `/deliveries` | Any | List deliveries, scoped by role (retailer → own, rider → assigned, dispatcher → all) |
| `GET` | `/deliveries/:id` | Any (owner only) | Full delivery detail, including status history |
| `PATCH` | `/deliveries/:id/assign` | Dispatcher | Assign a rider (delivery must be `PENDING`) |
| `PATCH` | `/deliveries/:id/status` | Rider (assigned only) | Advance the delivery's status |

**Create a delivery**
```json
POST /deliveries
{
  "customerName": "John Doe",
  "customerPhone": "0722222222",
  "deliveryAddress": "Kilimani, Nairobi",
  "itemDescription": "Document Package Box"
}
```

**Assign a rider**
```json
PATCH /deliveries/:id/assign
{ "riderId": "<uuid-of-a-user-with-role-RIDER>" }
```
Errors: `INVALID_RIDER` (400), `DELIVERY_NOT_FOUND` (404), `DELIVERY_NOT_ASSIGNABLE` (409, if not `PENDING`).

**Update status**
```json
PATCH /deliveries/:id/status
{ "status": "PICKED_UP" }
```
Errors: `UNAUTHORIZED_RIDER` (403, if not the assigned rider), `INVALID_STATUS_TRANSITION` (400).

A runnable set of these requests (with automatic token capture) is in [`reflex/backend/test.http`](reflex/backend/test.http).

## Known gaps / integration notes

Documenting these here so they don't get rediscovered the hard way:

- **No real-time sync.** There's no websocket/push layer — dashboards reflect the latest state on fetch/refetch, not instantly. The team's own functional test log marks "rider sees new assignment without refresh" and "status updates propagate live" as partial (✓/✗).
- **Frontend `confirmDelivery` has no backend counterpart.** `deliveriesApi.ts` calls `POST /deliveries/:id/confirm`, but the backend only implements `create`, `list`, `getOne`, `assign`, and `status` — there is no `/confirm` route yet.
- **Response-shape mismatch.** The frontend's `getDeliveries` expects the endpoint to resolve directly to `Delivery[]`, but the backend wraps all responses as `{ success, data: { deliveries } }`. This needs reconciling (either unwrap in `apiClient`, or change the backend response shape) before the two layers integrate cleanly.
- **`VITE_API_BASE_URL` default mismatch** — see [Frontend setup](#frontend-setup) above.
- **No reassignment.** Once a delivery is `ASSIGNED`, it can only move forward or be cancelled — there's no path to reassign it to a different rider.
- **Assignment is manual.** The dispatcher picks a rider by hand; there's no availability or load-balancing logic.

## Testing

- Functional test cases and their pass/fail status live in [`docs/Testing, Q&A, Security and Defence Preparation.md`](<docs/Testing,Q&A,Security and Defence Preparation..md>).
- Manual/exploratory API testing: [`reflex/backend/test.http`](reflex/backend/test.http) (run with the REST Client extension in VS Code, or similar).
- No automated test suite currently exists in the repo.

## Roadmap

- Real-time status sync (websockets or polling)
- A `/confirm` (or equivalent) endpoint to match the frontend's expected delivery workflow
- Rider availability signals to inform dispatcher assignment
- Notifications (SMS/push) to retailer and customer on status change
- Reporting on delivery volume and turnaround time
