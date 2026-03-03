# KEZAD Utilities Management Platform — Build Plan

> **Client:** KEZAD Utilities & Facilities Management (KUFM), AD Ports Group
> **Vendor:** Intertec Systems LLC
> **Ref:** Kezad_UtilitiesManagement_17022026
> **System:** Utilities Management & Billing Platform for 2,030+ industrial investors

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript (strict mode, everywhere) |
| Backend | Fastify + Node.js |
| Frontend | Next.js 14 (App Router) |
| UI | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL via Prisma ORM |
| Cache | Redis (ioredis) |
| Auth | JWT + RBAC (jsonwebtoken + bcrypt) |
| Validation | Zod (shared between API + frontend) |
| Data Fetching | TanStack Query v5 |
| Financial Math | decimal.js (6+ decimal precision) |
| Monorepo | Turborepo |
| Testing | Vitest + Supertest |
| API Docs | Swagger/OpenAPI (Fastify swagger plugin) |
| Linting | ESLint + Prettier |
| Integrations | All mocked (SCADA, BMS, CRM, ERP, Regulatory) |

---

## Project Structure

```
kezad-platform/
├── apps/
│   ├── api/                        # Fastify REST API (TypeScript)
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/           # JWT, OTP, session
│   │       │   ├── users/          # Users & RBAC
│   │       │   ├── customers/      # Customer management
│   │       │   ├── contracts/      # All 4 utility contract types
│   │       │   ├── consumption/    # Meter data, SCADA/BMS ingestion
│   │       │   ├── billing/        # Tariffs, invoices, reconciliation
│   │       │   ├── workflows/      # 6 workflow types, 5-level approvals
│   │       │   ├── integrations/   # Mock adapters (CRM/ERP/SCADA/BMS)
│   │       │   ├── reports/        # All report types + analytics
│   │       │   └── notifications/  # Mock SMS/Email (pluggable)
│   │       ├── middleware/
│   │       ├── plugins/
│   │       └── server.ts
│   ├── web-customer/               # Next.js 14 Customer Portal
│   └── web-employee/               # Next.js 14 Employee Portal
├── packages/
│   ├── database/                   # Prisma schema + generated client
│   ├── types/                      # Shared TypeScript interfaces + Zod schemas
│   ├── utils/                      # Shared utility functions
│   └── ui/                         # Shared shadcn/ui components
├── turbo.json
├── package.json
├── CLAUDE.md
└── BUILD_PLAN.md
```

---

## Phase 0 — Foundation & Infrastructure
- [ ] Turborepo monorepo init with TypeScript
- [ ] packages/database: Prisma schema (30+ tables) + migrations
- [ ] packages/types: Shared TypeScript types + Zod schemas
- [ ] packages/utils: Financial math, date utils, gas calculation helpers
- [ ] packages/ui: shadcn/ui base components
- [ ] apps/api: Fastify server (cors, helmet, rate-limit, swagger, jwt, pino logger)
- [ ] apps/web-customer: Next.js 14 App Router + Tailwind + shadcn/ui
- [ ] apps/web-employee: Next.js 14 App Router + Tailwind + shadcn/ui
- [ ] Root: .env, turbo.json, eslint, prettier configs

## Phase 1 — Auth & RBAC
- [ ] POST /api/v1/auth/register (employee)
- [ ] POST /api/v1/auth/register/customer (OTP-based)
- [ ] POST /api/v1/auth/verify-otp
- [ ] POST /api/v1/auth/login
- [ ] POST /api/v1/auth/refresh
- [ ] POST /api/v1/auth/logout
- [ ] JWT middleware + RBAC decorator
- [ ] Roles: SUPER_ADMIN, ADMIN, MANAGER, OPERATOR, CUSTOMER
- [ ] Permission matrix per role
- [ ] Customer portal: Login page + auth context + protected routes
- [ ] Employee portal: Login page + auth context + protected routes

## Phase 2 — Customer & Contract Management
- [ ] Customer CRUD + CRM mock sync
- [ ] Contract creation — Industrial Gas
- [ ] Contract creation — Power
- [ ] Contract creation — Water
- [ ] Contract creation — District Cooling
- [ ] Gas: DCQ/ACQ engine, Nominated Qty (±10% / 105% cap)
- [ ] Gas: Take-or-Pay engine (95% threshold, shortfall)
- [ ] Gas: Overtake surcharge calculation
- [ ] Gas: Price escalation factors
- [ ] Gas: 140-day advance notice enforcement
- [ ] Gas: Year-end wash-up / wash-down
- [ ] Contract lifecycle: amendments, renewals, termination
- [ ] Consumption profile management (gas only)
- [ ] Contract versioning + audit trail
- [ ] Employee portal: Contract management UI
- [ ] Customer portal: Contract view UI

## Phase 3 — Consumption Data Management
- [ ] Meter CRUD (registration, type, utility)
- [ ] Mock SCADA adapter (OPC UA simulated — Siemens WinCC, Emerson)
- [ ] Mock BMS adapter (Modbus simulated — Tridium, Honeywell)
- [ ] Data ingestion pipeline (15-min / 60-min intervals)
- [ ] Validation: range check, rate-of-change, roll-over
- [ ] Sub-meter aggregation (1–2% tolerance)
- [ ] Gap detection + 72-hour backfill
- [ ] Quality flags: good / bad / suspect
- [ ] Deduplication (meter_id + period_end_utc + checksum)
- [ ] Manual meter reading endpoint
- [ ] Consumption profile forecasting + approval
- [ ] Employee portal: Meter + consumption UI
- [ ] Customer portal: Consumption charts

## Phase 4 — Billing & Rate Management Engine
- [ ] Tariff CRUD (version-controlled, effective dates)
- [ ] Volume-based rate engine
- [ ] Time-of-Use (TOU) rate engine
- [ ] Dynamic pricing engine
- [ ] Multi-tier rate engine
- [ ] Rate escalation schedule management
- [ ] Billing calc: Gas (DCQ min, ACQ, Take-or-Pay, Overtake)
- [ ] Billing calc: Power (TOU)
- [ ] Billing calc: Water (tiered)
- [ ] Billing calc: District Cooling (capacity RT + consumption ton-hours)
- [ ] 6-decimal precision via decimal.js throughout
- [ ] Batch invoice generation (≥10,000/cycle)
- [ ] PDF invoice generation
- [ ] Prorated invoices (partial month)
- [ ] Manual adjustments + credit notes
- [ ] Payment application + unapplied tracking
- [ ] Month-end / year-end reconciliation
- [ ] Re-rating engine (retroactive)
- [ ] Invoice archiving
- [ ] Employee portal: Billing ops UI
- [ ] Customer portal: Billing history + PDF download

## Phase 5 — Workflow Engine
- [ ] Generic workflow engine (5 approval levels, send-back)
- [ ] Contract Approval workflow (Gas + Cooling only)
- [ ] Consumption Profile Update workflow (Gas only)
- [ ] Billing Dispute workflow (all utilities)
- [ ] Service Activation/Deactivation workflow (all utilities)
- [ ] Tariff Change Approval workflow (all utilities)
- [ ] Invoice Approval workflow (all utilities)
- [ ] Employee portal: Workflow inbox UI
- [ ] Customer portal: Service request + dispute UI

## Phase 6 — Mock Integration Adapters
- [ ] CRM adapter (Dynamics 365 mock)
- [ ] ERP adapter (Oracle Fusion mock)
- [ ] SCADA adapter (OPC UA mock data generator)
- [ ] BMS adapter (Modbus mock data generator)
- [ ] Regulatory adapter (ATLP/Maqta mock)
- [ ] Payment gateway adapter (mock)
- [ ] Notification adapter (mock — log to DB + console)
- [ ] Batch file adapter (SFTP/CSV mock)

## Phase 7 — Customer Web Portal (Next.js 14)
- [ ] Layout: Header, sidebar, EN/AR language switcher (next-intl)
- [ ] Dashboard: Consumption trends, cost breakdown, alerts
- [ ] Profile: Company details, contacts
- [ ] Contracts: List + detail + terms
- [ ] Consumption: Charts, period comparison, export
- [ ] Billing: History table, invoice detail, PDF download
- [ ] Payments: Payment status + mock gateway UI
- [ ] Profile updates: Consumption profile amendment
- [ ] Service requests: Activation, deactivation, technical
- [ ] Meter verification request
- [ ] Notification centre

## Phase 8 — Employee Portal (Next.js 14)
- [ ] Layout: Role-based sidebar, header, notification bell
- [ ] Dashboard: KPI widgets, pending tasks, system alerts
- [ ] Customer management: List, detail, CRM sync
- [ ] Contract management: Create, amend, approve, lifecycle
- [ ] Meter management: Register, readings, data quality
- [ ] Billing operations: Run batch, view invoices, adjustments
- [ ] Workflow inbox: Approve/reject/send-back
- [ ] Tariff management: Rates, escalations
- [ ] Reports: All types with CSV/PDF export
- [ ] Analytics: Predictive charts, anomaly alerts
- [ ] User management: Roles, permissions, departments
- [ ] Audit log viewer

## Phase 9 — Reporting & Analytics
- [ ] Operational reports (usage, billing, revenue, KPI)
- [ ] Financial reports (AR aging, collections, IFRS revenue)
- [ ] Regulatory reports (UAE VAT/FTA, DoE)
- [ ] Audit trail reports
- [ ] Data quality reports
- [ ] Predictive consumption modelling (rule-based, seasonal)
- [ ] What-if scenario modelling
- [ ] Anomaly detection
- [ ] Report export (CSV + PDF)

## Phase 10 — Quality & Polish
- [ ] Vitest unit tests — billing engine, gas logic, workflow engine
- [ ] Supertest integration tests — all major API endpoints
- [ ] Swagger/OpenAPI docs — complete
- [ ] Zod validation — all request bodies
- [ ] Structured error responses
- [ ] Rate limiting per route
- [ ] Security headers (Helmet)
- [ ] Cursor-based pagination on all lists
- [ ] Seed data script (demo data)
- [ ] Performance audit

---

## Database Tables (Prisma)

| Domain | Tables |
|--------|--------|
| Auth | users, roles, permissions, user_roles, otp_codes, refresh_tokens |
| Customers | customers, customer_contacts, customer_documents |
| Contracts | contracts, contract_versions, contract_amendments |
| Gas | gas_contract_details, nominated_quantities, top_shortfalls, overtake_records, year_end_reconciliations |
| Power | power_contract_details |
| Water | water_contract_details |
| Cooling | cooling_contract_details |
| Profiles | consumption_profiles, consumption_profile_versions |
| Meters | meters, meter_readings, meter_data_points, consumption_records |
| Data Quality | data_quality_flags |
| Billing | tariffs, tariff_versions, tariff_rates, tariff_tiers |
| Invoices | billing_runs, invoices, invoice_line_items |
| Adjustments | credit_notes, billing_adjustments, payments |
| Workflows | workflows, workflow_steps, workflow_instances, workflow_actions |
| Requests | service_requests, billing_disputes |
| System | notifications, audit_logs, report_snapshots |
| Mock | mock_scada_data, mock_bms_data |

---

## Key Engineering Standards
- All financial math via `decimal.js` — never native JS floats
- All timestamps in UTC (stored as `timestamptz` in PostgreSQL)
- Soft deletes on critical entities (`deleted_at` column)
- Prisma middleware for automatic audit log on every mutation
- Zod schemas in `packages/types` — imported by both API and frontend
- API versioned at `/api/v1/`
- Cursor-based pagination on all list endpoints
- Structured errors: `{ success, error: { code, message, details } }`
- Pluggable notification adapter (swap mock → real SMTP/SMS without code changes)
