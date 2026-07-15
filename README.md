# FrontDesk Pulse

Multi-tenant SaaS MVP for local service businesses: AI phone receptionist, lead capture, appointment booking, follow-up tasks, and a deterministic Business Health Score.

Repository product name: **FrontDesk Pulse** (Local Business AI Receptionist).

## Phase 1 architecture

Start here before diving into code:

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/security.md`](docs/security.md)
- [`docs/data-model.md`](docs/data-model.md)
- [`docs/integrations.md`](docs/integrations.md)
- [`docs/mvp-boundaries.md`](docs/mvp-boundaries.md)
- [`docs/implementation-sequence.md`](docs/implementation-sequence.md)

## Stack

- Next.js App Router + TypeScript (strict)
- Tailwind CSS + shadcn-style UI primitives
- PostgreSQL + Prisma
- Auth.js (NextAuth) Credentials (Clerk-ready via `authProviderId`)
- Zod validation
- Provider abstractions for AI, Twilio voice/SMS, calendar
- Vitest + Playwright
- Mock providers by default for local/demo

## Vertical slice (working now)

1. Sign in
2. Create / use a business workspace
3. Complete business profile + receptionist setup
4. Simulate an inbound call (mocked Twilio/OpenAI/SMS/calendar)
5. Lead + follow-up task created
6. Dashboard KPIs update
7. Business Health Score recalculates with deductions/recommendations

## Local setup

### Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL 16+

### Install

```bash
pnpm install
cp .env.example .env
# edit DATABASE_URL and secrets as needed
pnpm exec prisma migrate dev
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Business owner | `owner@precisioncnc.demo` | `DemoOwner123!` |
| Staff | `staff@precisioncnc.demo` | `DemoOwner123!` |
| Platform admin | `admin@frontdeskpulse.demo` | `DemoOwner123!` |

Demo tenant: **Precision CNC Works** (`/dashboard` after owner sign-in).

Platform admin: `/admin`

### Simulate a call

On the dashboard, use **Simulate inbound call**, or:

```bash
curl -X POST http://localhost:3000/api/demo/simulate-call \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "tenantId":"<tenant-id>",
    "fromPhoneNumber":"+15550123456",
    "callerSpeech":"I need a CNC machining quote and a project review appointment",
    "callerFirstName":"Alex",
    "callerLastName":"Morgan"
  }'
```

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start local app |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Vitest unit/integration |
| `pnpm test:e2e` | Playwright |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:studio` | Prisma Studio |

## Environment variables

See [`.env.example`](.env.example). Never commit real secrets.

Key flags:

- `PROVIDER_MODE=mock|hybrid|live`
- `AI_PROVIDER=mock|openai`
- `TELEPHONY_PROVIDER=mock|twilio`
- `SMS_PROVIDER=mock|twilio`
- `CALENDAR_PROVIDER=mock|google|calcom`

## Deployment (Vercel)

1. Create a PostgreSQL database (Neon/Supabase).
2. Set all env vars from `.env.example` in Vercel.
3. Deploy the Next.js app.
4. Run `pnpm exec prisma migrate deploy` against production DB.
5. Optionally run `pnpm db:seed` only for demo environments.
6. Point Twilio voice webhooks to:
   - `POST /api/webhooks/twilio/voice`
   - `POST /api/webhooks/twilio/status`
7. Set `TWILIO_VALIDATE_SIGNATURE=true` in production.

## Security notes

- Tenant access is resolved from membership, never trusted from raw client `tenantId` alone.
- Twilio signatures verified in live telephony mode.
- AI outputs validated with Zod before persistence.
- Prompt-injection resistant mock AI heuristics + server-side tool policy.
- Platform admin dashboard avoids casual access to private call content; admin views are audited.
- Recording/transcription consent is configurable; businesses remain responsible for legal compliance.

## Known limitations (MVP)

- OpenAI live adapter is scaffolded behind `AI_PROVIDER` but mock remains default until an API key path is fully wired for streaming voice turns.
- Conversational Twilio Media Streams are not fully implemented; inbound webhook + demo simulation drive the core workflow.
- Google/Cal.com adapters are interface-ready; mock calendar used by default.
- Knowledge retrieval is FAQ/document text matching (embedding fields reserved for pgvector later).
- Billing page is a placeholder.
- Email/push notifications are schema-ready, in-app only for now.
- Lead CSV export / bulk edit UI controls are deferred beyond list/detail views.

## License

Private MVP — all rights reserved.
