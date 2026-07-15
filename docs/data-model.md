# Database Design (Prisma)

## Design Principles

1. Every tenant-owned entity has `tenantId`.
2. Prefer enums in Prisma for stable status/intent sets.
3. JSON fields for flexible config (`businessHours`, `escalationRules`, AI structured payloads) validated in application layer with Zod.
4. Unique constraints on external IDs (`twilioCallSid`, `twilioMessageSid`).
5. Soft delete via optional `deletedAt` on sensitive/customer-facing entities where useful.
6. Vector readiness: `KnowledgeBaseChunk.embeddingReference` + `metadata` JSON; no pgvector required for MVP.

## Entity Relationship (logical)

```
User ──< TenantMembership >── Tenant
Tenant ── 1:1 BusinessProfile
Tenant ── 1:1 ReceptionistConfiguration
Tenant ──< KnowledgeBaseDocument ──< KnowledgeBaseChunk
Tenant ──< Caller ──< Call ──< CallEvent
Caller ──< Lead ──< FollowUpTask
Caller ──< Appointment
Call ── optional Lead / Appointment / FollowUpTask / SmsMessage
Tenant ──< HealthScoreSnapshot
Tenant ──< IntegrationConnection
Tenant ──< AuditLog / Notification
Tenant ── TwilioNumberMapping (inbound number → tenant)
```

## Enums (initial)

- `TenantStatus`: PENDING_SETUP | ACTIVE | SUSPENDED | DISABLED
- `MembershipRole`: OWNER | STAFF | PLATFORM_ADMIN (platform admin may also be global flag on User)
- `CallDirection`: INBOUND | OUTBOUND
- `CallStatus`: RINGING | IN_PROGRESS | COMPLETED | FAILED | BUSY | NO_ANSWER | CANCELED
- `CallIntent`: GENERAL_INFORMATION | APPOINTMENT_REQUEST | QUOTE_REQUEST | NEW_LEAD | EXISTING_CUSTOMER | SUPPORT_REQUEST | BILLING_QUESTION | EMERGENCY_REQUEST | SPAM | OTHER
- `CallOutcome`: INFORMATION_PROVIDED | LEAD_CAPTURED | APPOINTMENT_BOOKED | ESCALATED | VOICEMAIL | ABANDONED | SPAM | UNRESOLVED | OTHER
- `ResolutionStatus`: RESOLVED | NEEDS_FOLLOW_UP | ESCALATED | UNRESOLVED
- `LeadStatus`: NEW | CONTACTED | QUALIFIED | APPOINTMENT_BOOKED | QUOTE_REQUESTED | WON | LOST | UNRESPONSIVE
- `LeadPriority`: LOW | MEDIUM | HIGH | URGENT
- `AppointmentStatus`: PENDING | CONFIRMED | COMPLETED | CANCELLED | NO_SHOW
- `TaskStatus`: OPEN | IN_PROGRESS | COMPLETED | CANCELLED
- `TaskPriority`: LOW | MEDIUM | HIGH | URGENT
- `SmsDirection`: INBOUND | OUTBOUND
- `SmsStatus`: QUEUED | SENT | DELIVERED | FAILED | RECEIVED
- `KbDocumentStatus`: DRAFT | PROCESSING | READY | FAILED
- `IntegrationProvider`: TWILIO | GOOGLE_CALENDAR | CALCOM | OPENAI
- `IntegrationStatus`: CONNECTED | DISCONNECTED | ERROR | PENDING
- `NotificationType`: HIGH_PRIORITY_LEAD | EMERGENCY_ESCALATION | ... 

## Platform Admin

`User.isPlatformAdmin` boolean avoids inventing a fake tenant for admins. Platform routes check this flag. Optional memberships still allow admins to demo tenants.

## Indexes / Constraints

| Model | Constraint |
|-------|------------|
| Tenant | unique `slug` |
| TenantMembership | unique `(tenantId, userId)` |
| BusinessProfile | unique `tenantId` (one active profile) |
| ReceptionistConfiguration | unique `tenantId` |
| Caller | index `(tenantId, phoneNumber)`; unique `(tenantId, phoneNumber)` |
| Call | unique `twilioCallSid` |
| SmsMessage | unique `twilioMessageSid` (nullable unique) |
| CallEvent | index `(tenantId, callId, eventTimestamp)` |
| Lead | index `(tenantId, status)`, `(tenantId, followUpDeadline)` |
| Appointment | index `(tenantId, startTime)` |
| FollowUpTask | index `(tenantId, status, dueAt)` |
| TwilioInboundNumber | unique `phoneNumber` → `tenantId` |

## AI Auditability

Calls store:

- Original AI fields: `intent`, `summary`, `sentiment`, `outcome`, `aiConfidence`, `aiRawResult` (JSON)
- Optional corrections: `intentOverride`, `outcomeOverride`, `correctedByUserId`, `correctedAt`

UI displays effective values; originals preserved.

## Health Score Snapshot

Stores category breakdown JSON, deductions JSON, recommendations JSON, `calculationVersion`, period bounds, total score. Historical snapshots are append-only.

## Schema Location

Implemented in `prisma/schema.prisma` during Phase 2/3.
