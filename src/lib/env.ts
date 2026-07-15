import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16).optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(),
  PROVIDER_MODE: z.enum(["mock", "hybrid", "live"]).default("mock"),
  AI_PROVIDER: z.enum(["mock", "openai"]).default("mock"),
  TELEPHONY_PROVIDER: z.enum(["mock", "twilio"]).default("mock"),
  SMS_PROVIDER: z.enum(["mock", "twilio"]).default("mock"),
  CALENDAR_PROVIDER: z.enum(["mock", "google", "calcom"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VALIDATE_SIGNATURE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  CALCOM_API_KEY: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  DEMO_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  SEED_DEMO_PASSWORD: z.string().default("DemoOwner123!"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function resetEnvCache() {
  cached = null;
}

export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  const data = parsed.data;
  if (!data.AUTH_SECRET && !data.NEXTAUTH_SECRET) {
    if (data.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET or NEXTAUTH_SECRET is required in production");
    }
  }

  cached = data;
  return data;
}

export function getAuthSecret(): string {
  const env = getEnv();
  return env.NEXTAUTH_SECRET ?? env.AUTH_SECRET ?? "dev-only-insecure-secret-change-me";
}
