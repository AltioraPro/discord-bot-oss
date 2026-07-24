import { z } from 'zod';

/** Discord snowflakes are 17 to 20 digit numeric strings. */
const snowflake = z
  .string()
  .regex(/^\d{17,20}$/, 'must be a Discord snowflake id');

/** A comma separated list of snowflakes, for example "123,456". */
const snowflakeList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
  )
  .pipe(z.array(snowflake).min(1, 'must contain at least one channel id'));

/**
 * The raw object schema. Exported separately from `envSchema` because
 * `.superRefine()` hides `.shape`, and `ENV_KEYS` needs it.
 */
export const envObject = z.object({
  // Discord
  DISCORD_BOT_TOKEN: z.string().min(1, 'is required'),
  DISCORD_GUILD_ID: snowflake,
  DEEPWORK_VOICE_CHANNEL_IDS: snowflakeList,

  // Inbound oRPC server
  BOT_PORT: z.coerce.number().int().positive().max(65535).default(3001),
  WEBHOOK_SECRET: z.string().min(16, 'must be at least 16 characters'),

  // External backend, optional. Absent means degraded mode.
  APP_URL: z.url('must be a valid URL').optional(),
  API_SECRET: z.string().min(1).optional(),
  OAUTH_REDIRECT_URL: z.url('must be a valid URL').optional(),
});

export const envSchema = envObject.superRefine((value, ctx) => {
  if (value.APP_URL && !value.API_SECRET) {
    ctx.addIssue({
      code: 'custom',
      path: ['API_SECRET'],
      message: 'is required when APP_URL is set',
    });
  }

  if (value.API_SECRET && !value.APP_URL) {
    ctx.addIssue({
      code: 'custom',
      path: ['APP_URL'],
      message: 'is required when API_SECRET is set',
    });
  }
});

/** Every declared variable name, in declaration order. */
export const ENV_KEYS: string[] = Object.keys(envObject.shape);

export type Env = z.infer<typeof envSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
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
