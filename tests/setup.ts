process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/frontdesk_pulse?schema=public";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-auth-secret-32-characters-long";
process.env.NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "test-auth-secret-32-characters-long";
process.env.NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
process.env.PROVIDER_MODE = "mock";
process.env.AI_PROVIDER = "mock";
process.env.TELEPHONY_PROVIDER = "mock";
process.env.SMS_PROVIDER = "mock";
process.env.CALENDAR_PROVIDER = "mock";
process.env.DEMO_MODE = "true";

