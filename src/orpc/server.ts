import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { Client } from "discord.js";
import { logger } from "../lib/logger";
import { createRoleApplier } from "../roles/apply";
import type { RoleConfig } from "../roles/config";
import { buildRoleRouter } from "./router";

export interface OrpcServerDeps {
  client: Client;
  config: RoleConfig;
  guildId: string;
  port: number;
  secret: string;
}

/**
 * Starts the inbound HTTP server on 0.0.0.0:port and returns a stop function
 * for graceful shutdown. Plain JSON in, plain JSON out.
 */
export function startOrpcServer(deps: OrpcServerDeps): () => void {
  const syncOne = createRoleApplier(deps.client, deps.guildId, deps.config);
  const handler = new OpenAPIHandler(
    buildRoleRouter({ secret: deps.secret, syncOne })
  );

  const server = Bun.serve({
    async fetch(req) {
      const { matched, response } = await handler.handle(req, {
        context: { headers: req.headers },
        prefix: "/rpc",
      });
      return matched ? response : new Response("Not found", { status: 404 });
    },
    hostname: "0.0.0.0",
    port: deps.port,
  });

  logger.info("HTTP server listening", { port: deps.port });

  return () => {
    server.stop(true);
  };
}
