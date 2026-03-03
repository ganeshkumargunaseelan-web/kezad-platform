# KEZAD Platform

## Stack
- **API**: Fastify + TypeScript | **DB**: PostgreSQL + Prisma | **Cache**: Redis
- **Frontend**: Next.js 14 App Router + Tailwind + shadcn/ui
- **Auth**: JWT (15min) + Refresh tokens (7d) + RBAC
- **Monorepo**: Turborepo | **Validation**: Zod everywhere

## Critical Rules
- Financial math: `decimal.js` ONLY — never JS floats
- All timestamps: UTC (`timestamptz`)
- Soft deletes on contracts, invoices, customers (`deleted_at`)
- Zod schemas live in `packages/types` — shared API ↔ Frontend
- API versioned at `/api/v1/`
- Pagination: cursor-based always
- Adapters: all integrations config-switched via `*_ADAPTER=mock|real` env vars

## Ports
- API: 3001 | Customer Portal: 3000 | Employee Portal: 3002

## DB
`DATABASE_URL=postgres://postgres:admin@postgres:5432/kezad`
Run: `cd packages/database && npx prisma migrate dev`

## Architecture Pattern
Decoupled modules — each module has: `routes → controller → service → repository → db`
Integration adapters implement interfaces — factory selects mock/real from env.
