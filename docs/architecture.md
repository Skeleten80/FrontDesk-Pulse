# Local Business AI Receptionist — Architecture Overview

**Product name (repo):** FrontDesk Pulse  
**Document version:** 1.0  
**Phase:** 1 — Architecture

## 1. Current Repository State

The repository was empty aside from a stub `README.md` (`# FrontDesk-Pulse`). There is no existing application code, schema, or conventions to conflict with this specification. This document is the source of truth for the MVP build.

## 2. Product Summary

FrontDesk Pulse is a multi-tenant SaaS platform that gives local service businesses an AI phone receptionist plus an operations dashboard. It answers inbound calls, classifies intent, answers approved questions, qualifies leads, books appointments, sends SMS follow-ups, tracks follow-up work, and produces a deterministic Business Health Score with prioritized owner actions.

This is **not** a generic chatbot. Core workflows are telephony → structured AI decisions → durable business records → actionable dashboard.

## 3. System Context

```
┌─────────────┐     Voice/SMS      ┌──────────────────┐
│   Caller    │◄──────────────────►│  Twilio Voice/SMS │
└─────────────┘                    └────────┬─────────┘
                                            │ webhooks (signed)
                                            ▼
┌─────────────┐   HTTPS/session    ┌──────────────────┐
│ Owner/Staff │◄──────────────────►│  Next.js App     │
│ Platform    │                    │  (App Router)    │
│ Admin       │                    └────────┬─────────┘
└─────────────┘                             │
                          ┌─────────────────┼─────────────────┐
                          ▼                 ▼                 ▼
                   ┌────────────┐   ┌────────────┐   ┌────────────┐
                   │ PostgreSQL │   │ OpenAI API │   │ Calendar   │
                   │ (Prisma)   │   │ (AI layer) │   │ Provider   │
                   └────────────┘   └────────────┘   └────────────┘
```

## 4. Technology Decisions

| Concern | Choice | Rationale |
|--------|--------|-----------|
| App framework | Next.js App Router + TypeScript strict | Server Actions + Route Handlers; Vercel-ready |
| UI | Tailwind CSS + shadcn/ui | Accessible, fast to ship, consistent |
| Database | PostgreSQL via Prisma | Relational multi-tenant model; Neon/Supabase compatible |
| Auth | Auth.js (NextAuth) with Credentials + Demo provider abstraction | Works offline/demo without Clerk keys; interface allows Clerk later |
| AI | OpenAI via `AiProvider` interface | Mock first, real OpenAI second |
| Telephony | Twilio via `TelephonyProvider` | Signature-verified webhooks; mock for vertical slice |
| SMS | Twilio Messaging via `SmsProvider` | Same account; mock first |
| Calendar | `CalendarProvider` (Mock → Google/Cal.com) | Never claim booking until provider confirms |
| Validation | Zod everywhere | Webhooks, forms, AI structured outputs |
| Charts | Recharts | Health score + KPI trends |
| Tests | Vitest + Playwright | Unit/integration + critical E2E |
| Deploy | Vercel | Aligns with Next.js |

**Auth note:** Spec allows Clerk or Supabase Auth. For a runnable MVP and demo mode without mandatory third-party keys, Auth.js Credentials + seed demo users are the default. A `AuthProvider` boundary keeps Clerk swap-in possible.

## 5. High-Level Module Boundaries

```
src/
  app/                 # Routes, layouts, API handlers, Server Actions
  components/          # UI (shared + feature)
  lib/                 # env, db, auth helpers, logging, utils
  domain/              # Zod schemas, enums, pure domain types
  services/            # Business logic (tenant-aware)
  providers/           # Replaceable third-party adapters
  server/              # Authorization, request context, rate limits
```

### Service layer (required)

| Service | Responsibility |
|---------|----------------|
| `aiService` | Intent, qualification, summary, outcome; structured Zod outputs |
| `telephonyService` | Inbound call lifecycle, TwiML/mock responses, recording hooks |
| `smsService` | Outbound/inbound SMS, delivery status |
| `calendarService` | Availability, create/cancel appointments |
| `knowledgeBaseService` | FAQ/docs ingest, retrieval for answers |
| `leadService` | Lead create/update, assignment, pipeline |
| `callService` | Call records, events, finalization |
| `healthScoreService` | Deterministic scoring, snapshots, recommendations |
| `notificationService` | In-app notifications (email/push-ready) |
| `auditService` | Security-sensitive and admin access logging |

### Provider interfaces

- `AiProvider`
- `TelephonyProvider`
- `SmsProvider`
- `CalendarProvider`
- `StorageProvider` (recordings/documents references)
- `AuthAdapter` (session/user resolution)

Implementations: `mock/*` for vertical slice and tests; `openai/*`, `twilio/*`, `google-calendar/*` (or calcom) behind env flags.

## 6. Main Data Flows

### 6.1 Onboarding (authenticated)

1. User signs in → session established.
2. User creates Tenant + OWNER membership (transaction).
3. BusinessProfile + ReceptionistConfiguration created.
4. Optional knowledge FAQs and integration connections.
5. Explicit activation sets `Tenant.status = ACTIVE`.

Tenant id is **never** accepted from the client as proof of access. Membership is resolved from the session user.

### 6.2 Inbound call (mocked then Twilio)

1. Webhook received → verify signature (or mock auth header in demo).
2. Resolve tenant by inbound phone number / Twilio number mapping.
3. Upsert Caller by `(tenantId, phoneNumber)`.
4. Create Call + CallEvent (`INCOMING`) with idempotency on `twilioCallSid`.
5. Load ReceptionistConfiguration + BusinessProfile + KB chunks.
6. AI conversation turns: identify → classify intent (Zod) → answer/qualify/book/escalate.
7. Tool actions (book, SMS, transfer) authorized by **server policy**, not model text.
8. On completion: transcript, summary, outcome, lead upsert, follow-up tasks, SMS, health-score trigger, events.

### 6.3 Appointment booking

1. CalendarProvider.getAvailability → offer ≤3 slots.
2. Confirm name/phone/timezone/(email).
3. CalendarProvider.createAppointment → only then persist CONFIRMED + external id.
4. SMS confirmation via SmsProvider.
5. Rollback/compensate if SMS fails after booking (log + notify owner; appointment remains unless policy says otherwise).

### 6.4 Business Health Score

1. `calculateBusinessHealthScore({ tenantId, periodStart, periodEnd })`.
2. Deterministic category scores; insufficient data → “Not enough data” and reweight among available categories.
3. Persist `HealthScoreSnapshot` with `calculationVersion`, deductions, recommendations.
4. Dashboard reads latest snapshot + trend vs previous period.

## 7. Multi-Tenant Model

- Every tenant-owned row includes `tenantId`.
- Access path: `session.userId` → `TenantMembership` → role → resource checks.
- Helpers:
  - `requireAuthenticatedUser()`
  - `requireTenantMembership(userId, tenantId)`
  - `requireTenantRole(membership, roles[])`
  - `assertTenantResourceAccess(resource.tenantId, membership.tenantId)`
- Platform Admin uses separate routes; access to sensitive call content is audited.

## 8. Security Model (summary)

See `docs/security.md` for detail.

Pillars:

1. Tenant isolation on every query.
2. Role-based authorization (PLATFORM_ADMIN, OWNER, STAFF).
3. Twilio signature verification + webhook rate limiting + idempotency.
4. Zod validation for all external and AI outputs.
5. Prompt-injection resistance: untrusted KB/caller text; server-side tool policy.
6. Secrets only in env; encrypted credential references for integrations.
7. Audit logging for admin/sensitive actions.
8. Treat recordings/transcripts as sensitive; consent configuration (business-responsible).

## 9. Folder Structure

```
/
├── docs/
│   ├── architecture.md          # This document
│   ├── security.md
│   ├── data-model.md
│   ├── integrations.md
│   ├── mvp-boundaries.md
│   └── implementation-sequence.md
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   │   ├── (marketing)/         # Landing (minimal)
│   │   ├── (auth)/              # Sign in / sign out
│   │   ├── (app)/               # Authenticated product shell
│   │   │   ├── onboarding/
│   │   │   ├── dashboard/
│   │   │   ├── calls/
│   │   │   ├── leads/
│   │   │   ├── appointments/
│   │   │   ├── tasks/
│   │   │   ├── customers/
│   │   │   ├── knowledge-base/
│   │   │   ├── health-score/
│   │   │   ├── settings/        # profile, receptionist, team, billing, integrations
│   │   │   └── layout.tsx
│   │   ├── (platform)/          # Platform admin
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   ├── webhooks/twilio/
│   │   │   ├── demo/            # Simulated inbound call (vertical slice)
│   │   │   ├── health-score/
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                  # shadcn
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── calls/
│   │   ├── leads/
│   │   └── health-score/
│   ├── domain/
│   │   ├── enums.ts
│   │   └── schemas/             # Zod (AI + API + forms)
│   ├── lib/
│   │   ├── db.ts
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── utils.ts
│   ├── server/
│   │   ├── auth.ts
│   │   ├── authorization.ts
│   │   ├── request-context.ts
│   │   └── rate-limit.ts
│   ├── services/
│   │   ├── ai/
│   │   ├── telephony/
│   │   ├── sms/
│   │   ├── calendar/
│   │   ├── knowledge-base/
│   │   ├── lead/
│   │   ├── call/
│   │   ├── health-score/
│   │   ├── notification/
│   │   ├── audit/
│   │   └── onboarding/
│   └── providers/
│       ├── ai/
│       ├── telephony/
│       ├── sms/
│       ├── calendar/
│       └── storage/
├── tests/                       # Vitest unit/integration
├── e2e/                         # Playwright
├── .env.example
├── README.md
├── package.json
├── vitest.config.ts
└── playwright.config.ts
```

## 10. API / Server Action Surface (MVP)

| Endpoint / Action | Purpose |
|-------------------|---------|
| `POST /api/webhooks/twilio/voice` | Inbound call |
| `POST /api/webhooks/twilio/status` | Call status |
| `POST /api/webhooks/twilio/recording` | Recording ready |
| `POST /api/webhooks/twilio/sms` | Inbound SMS status/body |
| `POST /api/demo/simulate-call` | Vertical-slice mocked inbound call |
| Server Actions: onboarding, leads, tasks, appointments | Authenticated mutations |
| `POST /api/health-score/calculate` | Recalculate (cron/manual; `CRON_SECRET`) |
| `GET` dashboard metrics via RSC + services | Tenant-scoped reads |

Webhook processing is **idempotent** (unique Twilio SIDs / event keys).

## 11. Observability

Structured JSON logs with:

- `requestId`
- `tenantId` (when known)
- `webhookEventId` / `twilioCallSid`
- AI latency + token usage
- Call-processing duration
- Integration failures (calendar/SMS/Twilio)
- Health-score calculation metadata

Platform admin: integration-health view of recent failures (no casual transcript access).

## 12. Demo Mode

Seed tenant: **Precision CNC Works** (machine shop).

Includes realistic calls/leads/appointments/tasks/snapshots and one integration warning. Demo credentials documented in README. Simulated call API uses mock providers end-to-end.

## 13. Conflicts With Spec / Pragmatic Deviations

| Spec item | MVP approach |
|-----------|--------------|
| Clerk/Supabase Auth | Auth.js Credentials + demo users; Clerk-ready adapter |
| Real Twilio/OpenAI/Calendar | Mock providers first; real adapters behind env |
| pgvector | Schema fields (`embeddingReference`) ready; keyword/FAQ retrieval for MVP |
| Cal.com or Google | `CalendarProvider` interface; Mock + Google stub |
| Full page set | Vertical slice pages first; remaining pages scaffolded progressively |

No conflicts with empty repo conventions.

## 14. Next Phase

**Phase 2 — Project Foundation**, then the **smallest complete vertical slice**:

Sign in → create workspace → business profile → simulate inbound call → lead + task → dashboard KPIs → health score recalculation → inspect deductions.

See `docs/implementation-sequence.md`.
