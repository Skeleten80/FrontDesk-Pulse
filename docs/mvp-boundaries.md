# MVP Boundaries

## In Scope (build now)

- Authentication (demo-capable)
- Multi-tenancy + RBAC helpers
- Business onboarding
- AI receptionist configuration
- Twilio integration path (mock first, real adapter next)
- Basic AI conversation / classification flow (structured)
- Call storage, transcript, summary
- Lead creation + follow-up tasks
- Appointment booking via calendar abstraction
- SMS confirmation via SMS abstraction
- Dashboard + Business Health Score
- Knowledge-base FAQs
- Team roles (OWNER / STAFF)
- Audit logs
- Demo mode + seed data
- Tests for isolation, webhooks, health score, vertical slice E2E (mocked)

## Out of Scope (explicitly deferred)

- Full accounting / invoicing / payroll
- Inventory management
- Complex marketing automation
- Native mobile apps
- Multi-language voice beyond architectural readiness
- Advanced outbound calling campaigns
- Full CRM replacement
- Industry-specific ERP features
- Email/push notification delivery (schema + service hooks only)
- Production pgvector semantic search (fields ready; FAQ/keyword retrieval for MVP)

## Vertical Slice Definition of Done

1. User signs in (demo credentials).
2. User creates a business workspace.
3. User completes business profile (+ receptionist basics).
4. Simulated inbound call received.
5. Caller classified; lead created.
6. Follow-up task generated.
7. Dashboard KPIs update.
8. Business Health Score recalculates.
9. Owner can inspect score categories, deductions, and recommendations.
