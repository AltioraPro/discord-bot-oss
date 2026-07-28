import { implement } from "@orpc/server";
import { botContract } from "../contracts/bot";
import type { RoleSyncRequest, RoleSyncResult } from "../roles/apply";
import { assertAuthorized } from "./middleware";

export interface RoleRouterDeps {
  secret: string;
  syncOne: (request: RoleSyncRequest) => Promise<RoleSyncResult>;
}

/**
 * Implements the contract over an injected sync function.
 *
 * The applier is a dependency rather than an import so the transport — auth,
 * validation, routing — can be tested without touching Discord.
 */
export function buildRoleRouter(deps: RoleRouterDeps) {
  const os = implement(botContract).$context<{ headers: Headers }>();

  const guarded = os.use(({ context, next }) => {
    assertAuthorized(context.headers.get("authorization"), deps.secret);
    return next();
  });

  return os.router({
    health: os.health.handler(() => ({
      status: "ok" as const,
      uptime: process.uptime(),
    })),

    roles: {
      sync: guarded.roles.sync.handler(({ input }) =>
        deps.syncOne({
          discordId: input.discordId,
          isPro: input.isPro ?? false,
          rank: input.rank,
        })
      ),

      syncMultiple: guarded.roles.syncMultiple.handler(async ({ input }) => {
        const results = await Promise.all(
          input.users.map((user) =>
            deps.syncOne({
              discordId: user.discordId,
              isPro: user.isPro ?? false,
              rank: user.rank,
            })
          )
        );
        return { results };
      }),
    },
  });
}
