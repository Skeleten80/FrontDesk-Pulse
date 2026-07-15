# Implementation Sequence

## Phase 1 — Architecture ✅

Deliverables:

- `docs/architecture.md`
- `docs/security.md`
- `docs/data-model.md`
- `docs/integrations.md`
- `docs/mvp-boundaries.md`
- This sequence document

**Gate:** Architecture reviewed; no production app code required before this gate.

## Status — Vertical Slice Landed

Phases 2–9 for the mocked vertical slice are implemented in-repo:

- Auth.js credentials + tenant membership authorization
- Prisma schema/migration + Precision CNC Works demo seed
- Mock AI / telephony / SMS / calendar providers
- `processInboundCall` + `/api/demo/simulate-call`
- Deterministic health-score service + dashboard
- Vitest coverage for isolation, webhooks, scoring, call flow
- README with local/deploy/demo instructions

Next integration work: swap mock providers to live OpenAI → Twilio → SMS → Calendar one at a time.

## Phase 2 — Project Foundation

Files (expected):

- `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind` config
- `src/lib/env.ts`, `src/lib/db.ts`, `src/lib/logger.ts`
- `src/server/auth.ts`, `src/server/authorization.ts`
- Prisma init + base schema
- `.env.example`
- shadcn/ui bootstrap

**Gate:** `pnpm lint`, `pnpm typecheck`, app boots.

## Phase 3 — Core Business Data

- Full Prisma models + migration
- Seed + demo tenant (Precision CNC Works)
- Onboarding server actions + pages (steps 1–3 minimum for slice)
- Tenant switcher membership resolution

**Gate:** Seed runs; owner can create workspace + profile.

## Phase 4 — Telephony (Mock Path)

- `TelephonyProvider` + mock
- `callService` idempotent create
- `POST /api/demo/simulate-call` and Twilio route stubs with signature helper
- CallEvent audit trail

**Gate:** Simulated call creates Caller + Call + events.

## Phase 5 — AI Layer (Mock Path)

- Zod AI schemas
- `AiProvider` mock returning deterministic structured outputs
- Intent → lead qualification → summary/outcome
- Prompt-injection guardrails in prompt builder + tool policy

**Gate:** Call finalization produces validated AI fields.

## Phase 6 — Calendar + SMS (Mock)

- `CalendarProvider` mock availability + create
- `SmsProvider` mock send + SmsMessage rows
- Appointment + confirmation SMS on booking intents
- Failed booking rollback tests

**Gate:** Appointment request path books only after mock calendar success.

## Phase 7 — Business Health Score

- `healthScoreService.calculateBusinessHealthScore`
- Category math, deductions, recommendations, snapshots
- Insufficient-data reweighting
- Dashboard visualization inputs

**Gate:** Unit tests for scoring + overdue follow-up deductions.

## Phase 8 — Dashboard + Management UI

- App shell, dashboard hero, KPIs, priorities, recent calls, pipeline
- Calls list/detail, leads list/detail, tasks, health score details
- Settings: profile, receptionist (slice-complete)

**Gate:** Owner can complete vertical slice visually.

## Phase 9 — Testing + Hardening

- Vitest: isolation, authz, Twilio signature, idempotency, health score, prompt injection
- Playwright: simulate-call happy path
- README, local setup, deploy notes, known limitations
- Lint/typecheck/test green

## Post-MVP Integration Swap

Replace one provider at a time: OpenAI → Twilio Voice → SMS → Calendar.

## Working Rules Per Phase

1. List files created/modified.
2. Note key architectural decisions.
3. Run lint, typecheck, applicable tests.
4. Fix failures before declaring complete.
5. Prefer smallest vertical slice over broad incomplete surfaces.
