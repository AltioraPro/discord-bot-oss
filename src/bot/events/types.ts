import type { ClientEvents } from "discord.js";

export interface EventHandler<
  K extends keyof ClientEvents = keyof ClientEvents,
> {
  handle: (...args: ClientEvents[K]) => void | Promise<void>;
  name: K;
  once?: boolean;
}

/**
 * The union of every concrete handler shape. Using this rather than
 * `EventHandler<keyof ClientEvents>` keeps each handler's arguments tied to
 * its own event name inside the registry array.
 */
export type AnyEventHandler = {
  [K in keyof ClientEvents]: EventHandler<K>;
}[keyof ClientEvents];

/** Identity function that infers `K` from `name`, so handlers stay typed. */
export function defineEvent<K extends keyof ClientEvents>(
  handler: EventHandler<K>
): EventHandler<K> {
  return handler;
}
