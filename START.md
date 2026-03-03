# KEZAD Platform — Quick Start Guide

## Prerequisites
- Node.js ≥ 20
- npm ≥ 10
- PostgreSQL running on localhost:5432 (database: `kezad`, user: `postgres`, pass: `admin`)
- Redis running on localhost:6379

## 1. Install dependencies
```bash
cd D:\KEZAD\kezad-platform
npm install
```

## 2. Configure environment
The `.env` file is already created with local development defaults.
Copy to apps that need it:
```bash
cp .env apps/api/.env
cp .env apps/web-customer/.env.local
cp .env apps/web-employee/.env.local
```

## 3. Database setup
```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates all tables)
cd packages/database
npx prisma migrate dev --name init

# Seed with demo data
npx prisma db seed
```

## 4. Run development servers
```bash
# From root — starts API + both portals in parallel
npm run dev
```

Or run individually:
```bash
# API (port 3000)
cd apps/api && npm run dev

# Customer Portal (port 3001)
cd apps/web-customer && npm run dev

# Employee Portal (port 3002)
cd apps/web-employee && npm run dev
```

## 5. Access the system
| Service | URL |
|---------|-----|
| **API** | http://localhost:3000 |
| **Swagger Docs** | http://localhost:3000/api/docs |
| **Health Check** | http://localhost:3000/health |
| **Customer Portal** | http://localhost:3001 |
| **Employee Portal** | http://localhost:3002 |

## 6. Login credentials (after seeding)
All accounts use password: `Password123!`

| Role | Email |
|------|-------|
| Super Admin | superadmin@kezad.ae |
| Admin | admin@kezad.ae |
| Manager | manager@kezad.ae |
| Operator | operator@kezad.ae |
| Customer 1 | procurement@globalsteel.ae |
| Customer 2 | utilities@petrochemicalabu.ae |
| Customer 3 | facilities@AlHamraMfg.ae |

## 7. Run tests
```bash
cd packages/utils
npm test
# or with coverage:
npm run test:coverage
```

## Switching to real integrations
Update `.env`:
```bash
CRM_ADAPTER=dynamics365        # then add D365_* credentials
ERP_ADAPTER=oracle-fusion      # then add ORACLE_FUSION_* credentials
SCADA_ADAPTER=opcua            # then add OPCUA_* endpoints
BMS_ADAPTER=modbus             # then add MODBUS_* hosts
REGULATORY_ADAPTER=atlp        # then add ATLP_* credentials
PAYMENT_ADAPTER=kezad-gateway  # then add PAYMENT_GATEWAY_* credentials
```
**No code changes required** — only environment variable updates.

## Architecture Overview
```
kezad-platform/
├── apps/
│   ├── api/          # Fastify REST API (port 3000)
│   ├── web-customer/ # Next.js 14 Customer Portal (port 3001)
│   └── web-employee/ # Next.js 14 Employee Portal (port 3002)
├── packages/
│   ├── database/     # Prisma schema + seed
│   ├── types/        # Shared Zod schemas
│   ├── utils/        # Business logic (gas/billing engines, decimal)
│   └── ui/           # Shared React components
```
