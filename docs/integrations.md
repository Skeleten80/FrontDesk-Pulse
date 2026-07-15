# Third-Party Integration Plan

## Strategy

All external systems are behind provider interfaces. Vertical slice and CI use **mock** implementations. Production adapters are selected via environment variables.

```
PROVIDER_MODE=mock|hybrid|live
AI_PROVIDER=mock|openai
TELEPHONY_PROVIDER=mock|twilio
SMS_PROVIDER=mock|twilio
CALENDAR_PROVIDER=mock|google|calcom
```

## OpenAI (`AiProvider`)

**Uses:** intent classification, knowledge answers, qualification, summarization, outcome, sentiment, recommendation phrasing.

**Rules:**

- Structured JSON → Zod parse → reject/retry on failure.
- Log latency + token usage.
- Never write free-form model output directly to typed columns without validation.
- System prompt template includes business name, industry, hours, services, escalation rules, prohibited topics.

**Swap path:** `providers/ai/mock-ai-provider.ts` → `providers/ai/openai-provider.ts`.

## Twilio Voice (`TelephonyProvider`)

**Uses:** inbound webhook → TwiML/stream responses; status + recording callbacks.

**Rules:**

- Signature verification required in live mode.
- Map To/Called number → tenant via `TwilioInboundNumber`.
- Idempotent call creation on `CallSid`.

**MVP vertical slice:** `POST /api/demo/simulate-call` drives the same `callService` / `telephonyService` path with mock provider.

## Twilio Messaging (`SmsProvider`)

**Uses:** confirmation SMS, callback promises, delivery status webhooks.

**Rules:** Opt-in/business configuration gates sending. Failures create notifications + integration errors; do not fabricate success.

## Calendar (`CalendarProvider`)

```ts
interface CalendarProvider {
  getAvailability(input: AvailabilityRequest): Promise<AvailableSlot[]>;
  createAppointment(input: CreateAppointmentRequest): Promise<AppointmentResult>;
  cancelAppointment(input: CancelAppointmentRequest): Promise<void>;
}
```

**Rules:**

- Offer ≤3 slots.
- Persist appointment as confirmed only after provider success.
- Store `externalCalendarEventId`.
- Failed booking must not leave orphan “confirmed” rows (transaction + compensating delete if needed).

## Storage (`StorageProvider`)

Abstract recording/document URLs. MVP may store provider URLs + signed URL helper stub.

## Auth

Auth.js Credentials for demo/local. Adapter interface documents Clerk migration (`authProviderId` on User already maps to external subject).

## Activation Order (after mocks stable)

1. OpenAI structured outputs  
2. Twilio signature + inbound voice webhook  
3. Twilio SMS  
4. Google Calendar or Cal.com  
5. Recording storage signed URLs  

Each step keeps the mock selectable for tests.
