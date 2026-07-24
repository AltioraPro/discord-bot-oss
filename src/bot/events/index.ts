import type { Client } from "discord.js";
import { logger } from "../../lib/logger";
import { readyHandler } from "./ready";
import type { AnyEventHandler } from "./types";

/** Every handler the bot binds. Later milestones append to this array. */
const handlers: AnyEventHandler[] = [readyHandler];

export function registerEvents(client: Client): void {
  for (const handler of handlers) {
    const listener = (...args: unknown[]): void => {
      // TypeScript cannot correlate a union of handler shapes with a union of
      // listener signatures, so the dispatch is cast once, here. Each handler
      // stays fully typed at its definition site through `defineEvent`.
      const dispatch = handler.handle as (
        ...a: unknown[]
      ) => void | Promise<void>;

      const result = dispatch(...args);

      // An async handler that rejects would otherwise become an unhandled
      // rejection and take the whole process down. One failed event is not a
      // reason to disconnect the bot.
      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          logger.error("Event handler failed", {
            event: String(handler.name),
            reason: error instanceof Error ? error.message : String(error),
          });
        });
      }
    };

    if (handler.once) {
      client.once(handler.name, listener);
      continue;
    }

    client.on(handler.name, listener);
  }
}
