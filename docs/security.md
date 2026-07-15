# Security Model

## Roles

| Role | Scope | Capabilities |
|------|-------|--------------|
| `PLATFORM_ADMIN` | System | Tenants list, disable accounts, usage aggregates, integration failures. Sensitive call content access is exceptional and **always audited**. |
| `OWNER` | Tenant | Full tenant configuration, calls/transcripts, leads, appointments, health score, team, billing, integrations. |
| `STAFF` | Tenant | Assigned leads, appointments, complete tasks, notes, update lead statuses. No billing/integration secrets/receptionist system prompt editing (MVP: settings write restricted to OWNER). |

Membership is unique per `(tenantId, userId)`.

## Authorization Helpers

```ts
requireAuthenticatedUser()           // session → user
requireTenantMembership(userId, id)  // membership or 403
requireTenantRole(membership, roles) // role gate
assertTenantResourceAccess(a, b)     // tenantId equality
```

**Rule:** Never trust a client-supplied `tenantId` as authorization. Resolve active tenant from membership (cookie/session preference validated against memberships).

## Tenant Isolation

- Every tenant-owned Prisma query includes `tenantId` from authorized membership.
- Unique indexes include tenant scope where natural (e.g. caller phone).
- Cross-tenant IDOR tests are mandatory.

## Webhooks

- Verify Twilio signatures with auth token + full URL.
- Rate-limit public webhook routes.
- Idempotency keys: `twilioCallSid`, `twilioMessageSid`, CallEvent dedupe.
- Validate payloads with Zod before DB writes.

## AI / Prompt Injection

Untrusted inputs:

- Caller speech / SMS body
- Knowledge-base document content

Model must ignore attempts to reveal prompts, exfiltrate data, cross tenants, invent prices, or trigger unauthorized tools.

**Tool authorization** is server-side:

- Booking only if `allowAppointmentBooking` and availability confirmed.
- SMS only if `allowSmsFollowUp` and templates/policy allow.
- Transfer only to configured `transferNumber` when `allowCallTransfer`.

All AI outputs used for persistence pass Zod schemas.

## Sensitive Data

- Recordings, transcripts, caller PII: sensitive.
- Prefer signed URLs for recordings.
- Consent flags on business profile / jurisdiction config; product does **not** hard-code legal claims.
- Soft delete where appropriate (`deletedAt`).
- Data-retention settings on tenant (MVP: fields + documentation).

## Secrets

- Env-only secrets (see `.env.example`).
- Integration credentials stored as `encryptedCredentialsReference` (pointer/key id), not plaintext in app DB rows.
- `ENCRYPTION_KEY` for local envelope encryption of references when needed.

## Audit Log

Log at least:

- Platform admin viewing tenant-sensitive resources
- Role changes
- Integration connect/disconnect
- Manual AI classification corrections
- Tenant disable/enable

## CSRF / Cookies

- Auth.js secure cookies in production (`secure`, `httpOnly`, `sameSite`).
- Server Actions inherit Next.js CSRF protections for cookie-authenticated mutations.
- Webhooks use signature verification instead of CSRF tokens.
