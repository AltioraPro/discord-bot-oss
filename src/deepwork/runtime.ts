import type { Client, MessageCreateOptions } from "discord.js";
import { loadEnv } from "../config/env";
import { logger } from "../lib/logger";
import {
  checkInPrompt,
  defaultDurationNotice,
  durationPrompt,
  type SessionOutcome,
  sessionSummary,
} from "./messages";
import {
  type DeepworkAction,
  dueActions,
  type SchedulerConfig,
} from "./scheduler";
import { sessions } from "./store";

const MS_PER_MINUTE = 60_000;

/**
 * How often the runtime asks the scheduler what is due.
 *
 * Short enough that a check-in interval configured in seconds for testing
 * still feels immediate, cheap enough to run forever: the tick only reads an
 * in-memory map.
 */
const TICK_MS = 5000;

function schedulerConfig(): SchedulerConfig {
  const env = loadEnv();

  return {
    checkInIntervalMs: env.DEEPWORK_CHECKIN_INTERVAL_MINUTES * MS_PER_MINUTE,
    checkInTimeoutMs: env.DEEPWORK_CHECKIN_TIMEOUT_MINUTES * MS_PER_MINUTE,
  };
}

/**
 * Sends a direct message, reporting whether it arrived.
 *
 * Members who disallow direct messages from server members are common, and
 * the failure is expected rather than exceptional, so it is reported as a
 * boolean instead of thrown.
 */
async function sendDirectMessage(
  client: Client,
  userId: string,
  payload: MessageCreateOptions
): Promise<boolean> {
  try {
    const user = await client.users.fetch(userId);
    await user.send(payload);
    return true;
  } catch (error) {
    logger.debug("Could not send a direct message", {
      reason: error instanceof Error ? error.message : String(error),
      userId,
    });
    return false;
  }
}

async function disconnectFromVoice(
  client: Client,
  userId: string
): Promise<void> {
  try {
    const env = loadEnv();
    const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
    const member = await guild.members.fetch(userId);
    await member.voice.disconnect("Deepwork check-in went unanswered");
  } catch (error) {
    logger.warn("Could not disconnect the member from voice", {
      reason: error instanceof Error ? error.message : String(error),
      userId,
    });
  }
}

/** Ends a session and tells the member how it went. */
export async function finishSession(
  client: Client,
  userId: string,
  outcome: SessionOutcome
): Promise<void> {
  const ended = sessions.end(userId);

  if (!ended) {
    return;
  }

  logger.info("Deepwork session ended", {
    active: sessions.size(),
    durationMinutes: Math.round(ended.durationMs / MS_PER_MINUTE),
    outcome,
    userId,
  });

  await sendDirectMessage(client, userId, sessionSummary(ended, outcome));
}

/**
 * Opens a session for a member who joined a deepwork room.
 *
 * When the prompt cannot be delivered the session still starts, on the
 * configured default length. A member who has direct messages closed keeps a
 * correct record of their focused time; they only lose the choice of length.
 */
export async function beginSession(
  client: Client,
  userId: string,
  channelId: string
): Promise<void> {
  sessions.start(userId, channelId);

  logger.info("Deepwork session started", {
    active: sessions.size(),
    channelId,
    userId,
  });

  const delivered = await sendDirectMessage(client, userId, durationPrompt());

  if (delivered) {
    return;
  }

  const { DEEPWORK_DEFAULT_DURATION_MINUTES: fallback } = loadEnv();

  sessions.activate(userId, fallback);

  logger.info("Direct message unavailable, applied the default length", {
    plannedMinutes: fallback,
    userId,
  });
}

async function applyDefaultDuration(
  client: Client,
  userId: string
): Promise<void> {
  const { DEEPWORK_DEFAULT_DURATION_MINUTES: fallback } = loadEnv();

  if (!sessions.activate(userId, fallback)) {
    return;
  }

  logger.info("No length chosen, applied the default", {
    plannedMinutes: fallback,
    userId,
  });

  await sendDirectMessage(client, userId, defaultDurationNotice(fallback));
}

async function sendCheckIn(client: Client, userId: string): Promise<void> {
  const session = sessions.get(userId);

  if (!session) {
    return;
  }

  const elapsedMinutes = (Date.now() - session.startedAt) / MS_PER_MINUTE;
  const delivered = await sendDirectMessage(
    client,
    userId,
    checkInPrompt(elapsedMinutes)
  );

  if (!delivered) {
    // Nothing can be confirmed if nothing was asked, so treat the member as
    // present rather than timing them out for a failure that is not theirs.
    sessions.confirmWorking(userId);
    return;
  }

  sessions.checkInSent(userId);
  logger.debug("Check-in sent", { userId });
}

async function timeOut(client: Client, userId: string): Promise<void> {
  await finishSession(client, userId, "timeout");
  await disconnectFromVoice(client, userId);
}

function runAction(client: Client, action: DeepworkAction): Promise<void> {
  switch (action.type) {
    case "apply-default-duration":
      return applyDefaultDuration(client, action.userId);
    case "complete":
      return finishSession(client, action.userId, "completed");
    case "send-check-in":
      return sendCheckIn(client, action.userId);
    default:
      return timeOut(client, action.userId);
  }
}

/**
 * Runs everything the scheduler says is due.
 *
 * Actions are independent — each concerns a different member — so they run
 * concurrently. Settling rather than racing means one member's failed direct
 * message cannot stop everyone else's check-in.
 */
export async function runDueActions(client: Client): Promise<void> {
  const actions = dueActions(sessions.active(), Date.now(), schedulerConfig());

  const results = await Promise.allSettled(
    actions.map((action) => runAction(client, action))
  );

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("A deepwork action failed", {
        reason: String(result.reason),
      });
    }
  }
}

/** Starts the tick that drives check-ins. Returns a function to stop it. */
export function startDeepworkRuntime(client: Client): () => void {
  const timer = setInterval(() => {
    runDueActions(client).catch((error: unknown) => {
      logger.error("Deepwork tick failed", {
        reason: error instanceof Error ? error.message : String(error),
      });
    });
  }, TICK_MS);

  return () => clearInterval(timer);
}
