import { oc } from "@orpc/contract";
import { z } from "zod";
import { RankKeySchema } from "./ranks";

const syncInput = z.object({
  discordId: z.string(),
  isPro: z.boolean().optional(),
  rank: RankKeySchema,
});

const syncResult = z.object({
  discordId: z.string(),
  error: z.string().optional(),
  success: z.boolean(),
});

/**
 * The HTTP surface the bot exposes. Route metadata lets OpenAPIHandler serve
 * plain JSON, so a backend in any language can POST to it with a bearer token.
 */
export const botContract = {
  health: oc
    .route({ method: "GET", path: "/health" })
    .output(z.object({ status: z.literal("ok"), uptime: z.number() })),

  roles: {
    sync: oc
      .route({ method: "POST", path: "/roles/sync" })
      .input(syncInput)
      .output(syncResult),

    syncMultiple: oc
      .route({ method: "POST", path: "/roles/syncMultiple" })
      .input(z.object({ users: z.array(syncInput) }))
      .output(z.object({ results: z.array(syncResult) })),
  },
};
