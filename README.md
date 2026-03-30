# MamaCare+ Backend (Express + MongoDB + TypeScript)

## Quick start
1. Copy `.env.example` to `.env` and update values.
2. Install dependencies: `npm install`
3. Run dev server: `npm run dev`

## API
- `GET /health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/mothers`
- `GET /api/mothers/:id`
- `POST /api/mothers/:id/children`
- `POST /api/mothers/:id/appointments`
- `PATCH /api/appointments/:id/status`
- `GET /api/dashboard/summary`
- `POST /api/mothers/:id/archive-if-eligible`
