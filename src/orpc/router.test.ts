import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import type { RoleSyncRequest, RoleSyncResult } from "../roles/apply";
import { buildRoleRouter } from "./router";

const SECRET = "a-sufficiently-long-secret";
const AUTH = {
  authorization: `Bearer ${SECRET}`,
  "content-type": "application/json",
};

// A fake applier: succeeds for everyone except the user id "999".
function fakeSync(request: RoleSyncRequest): Promise<RoleSyncResult> {
  if (request.discordId === "999") {
    return Promise.resolve({
      discordId: request.discordId,
      error: "unknown member",
      success: false,
    });
  }
  return Promise.resolve({ discordId: request.discordId, success: true });
}

let server: ReturnType<typeof Bun.serve>;
let base: string;

beforeAll(() => {
  const handler = new OpenAPIHandler(
    buildRoleRouter({ secret: SECRET, syncOne: fakeSync })
  );
  server = Bun.serve({
    async fetch(req) {
      const { matched, response } = await handler.handle(req, {
        context: { headers: req.headers },
        prefix: "/rpc",
      });
      return matched ? response : new Response("Not found", { status: 404 });
    },
    port: 0,
  });
  base = `http://localhost:${server.port}`;
});

afterAll(() => {
  server.stop(true);
});

describe("role router", () => {
  test("health needs no auth and reports ok", async () => {
    const res = await fetch(`${base}/rpc/health`);
    const body = (await res.json()) as { status: string; uptime: number };

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });

  test("sync without the token is rejected", async () => {
    const res = await fetch(`${base}/rpc/roles/sync`, {
      body: JSON.stringify({ discordId: "1", rank: "CHAMPION" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(401);
  });

  test("a malformed body is rejected", async () => {
    const res = await fetch(`${base}/rpc/roles/sync`, {
      body: JSON.stringify({ discordId: "1", rank: "NOT_A_RANK" }),
      headers: AUTH,
      method: "POST",
    });

    expect(res.status).toBe(400);
  });

  test("a valid sync returns success", async () => {
    const res = await fetch(`${base}/rpc/roles/sync`, {
      body: JSON.stringify({ discordId: "1", isPro: true, rank: "CHAMPION" }),
      headers: AUTH,
      method: "POST",
    });
    const body = (await res.json()) as RoleSyncResult;

    expect(res.status).toBe(200);
    expect(body).toEqual({ discordId: "1", success: true });
  });

  test("a batch reports per-member results and never fails as a whole", async () => {
    const res = await fetch(`${base}/rpc/roles/syncMultiple`, {
      body: JSON.stringify({
        users: [
          { discordId: "1", rank: "CHAMPION" },
          { discordId: "999", rank: "NEW" },
        ],
      }),
      headers: AUTH,
      method: "POST",
    });
    const body = (await res.json()) as { results: RoleSyncResult[] };

    expect(res.status).toBe(200);
    expect(body.results).toEqual([
      { discordId: "1", success: true },
      { discordId: "999", error: "unknown member", success: false },
    ]);
  });
});
