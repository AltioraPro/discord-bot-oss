import { z } from "zod";

/**
 * Treats a blank value as absent.
 *
 * A `.env` file copied from `.env.example` leaves optional keys present but
 * empty, as in `APP_URL=`. Without this, an empty string reaches the validator
 * and fails as a malformed URL, so a correctly filled configuration is
 * rejected for variables the operator deliberately left unset.
 */
function blankAsAbsent<T extends z.ZodType>(schema: T) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    schema
  );
}

/** Discord snowflakes are 17 to 20 digit numeric strings. */
const snowflake = z
  .string()
  .regex(/^\d{17,20}$/, "must be a Discord snowflake id");

/** A comma separated list of snowflakes, for example "123,456". */
const snowflakeList = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  )
  .pipe(z.array(snowflake).min(1, "must contain at least one channel id"));

/**
 * Configuration is grouped into three schemas rather than one flat object.
 * The grouping is structural on purpose: a formatter is free to sort keys
 * inside each group without scrambling which group a variable belongs to,
 * which is what happens when the grouping lives only in comments.
 */

/** Discord connection. All required. */
const discordEnv = z.object({
  DEEPWORK_VOICE_CHANNEL_IDS: snowflakeList,
  // Trimmed before validation: a stray space around a value in a .env file is
  // invisible, and would otherwise be sent to Discord verbatim.
  DISCORD_BOT_TOKEN: z.string().trim().min(1, "is required"),
  DISCORD_GUILD_ID: snowflake,
});

/** The inbound oRPC server this bot exposes. All required. */
const serverEnv = z.object({
  BOT_PORT: blankAsAbsent(
    z.coerce.number().int().positive().max(65_535).default(3001)
  ),
  WEBHOOK_SECRET: z.string().trim().min(16, "must be at least 16 characters"),
});

/**
 * The external backend. Entirely optional: leaving it unset selects degraded
 * mode, where deepwork sessions are kept in memory and nothing is persisted.
 */
const backendEnv = z.object({
  API_SECRET: blankAsAbsent(z.string().min(1).optional()),
  APP_URL: blankAsAbsent(z.url("must be a valid URL").optional()),
  OAUTH_REDIRECT_URL: blankAsAbsent(z.url("must be a valid URL").optional()),
});

/**
 * Deepwork session timing. All optional, with the cadence Altiora runs as the
 * default. Lower values are also what makes the check-in cycle verifiable in
 * seconds rather than in half hours.
 */
const deepworkEnv = z.object({
  DEEPWORK_CHECKIN_INTERVAL_MINUTES: blankAsAbsent(
    z.coerce.number().positive().max(1440).default(30)
  ),
  DEEPWORK_CHECKIN_TIMEOUT_MINUTES: blankAsAbsent(
    z.coerce.number().positive().max(1440).default(5)
  ),
  DEEPWORK_DEFAULT_DURATION_MINUTES: blankAsAbsent(
    z.coerce.number().positive().max(1440).default(120)
  ),
});

/** Process behaviour. Both have defaults, so neither is required. */
const runtimeEnv = z.object({
  LOG_LEVEL: blankAsAbsent(
    z.enum(["debug", "info", "warn", "error"]).default("info")
  ),
  NODE_ENV: blankAsAbsent(
    z.enum(["development", "production", "test"]).default("development")
  ),
});

/**
 * The raw object schema. Exported separately from `envSchema` because
 * `.superRefine()` hides `.shape`, and `ENV_KEYS` needs it.
 */
export const envObject = discordEnv
  .extend(serverEnv.shape)
  .extend(backendEnv.shape)
  .extend(deepworkEnv.shape)
  .extend(runtimeEnv.shape);

export const envSchema = envObject.superRefine((value, ctx) => {
  if (value.APP_URL && !value.API_SECRET) {
    ctx.addIssue({
      code: "custom",
      message: "is required when APP_URL is set",
      path: ["API_SECRET"],
    });
  }

  if (value.API_SECRET && !value.APP_URL) {
    ctx.addIssue({
      code: "custom",
      message: "is required when API_SECRET is set",
      path: ["APP_URL"],
    });
  }
});

/** Every declared variable name, grouped Discord then server then backend. */
export const ENV_KEYS: string[] = Object.keys(envObject.shape);

export type Env = z.infer<typeof envSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Validates an environment source. Pure: it never reads `process.env`,
 * which is what makes it testable without mutating global state.
 *
 * Throws once listing every problem, rather than failing on the first.
 * A bot that starts with a broken configuration and dies later is worse
 * than one that refuses to start.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${formatIssues(result.error)}`
    );
  }

  return result.data;
}

let cached: Env | undefined;

/**
 * The process environment, parsed once and memoised.
 *
 * This is a function rather than a top level `const` on purpose: an eager
 * parse would throw merely on importing this module, which would break every
 * test that transitively imports it.
 */
export function loadEnv(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}
