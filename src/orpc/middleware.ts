import { timingSafeEqual } from "node:crypto";
import { ORPCError } from "@orpc/server";

/**
 * Constant-time check of an Authorization header against `Bearer <secret>`.
 *
 * Pure and total: it returns false rather than throwing, including when the
 * header is absent or a different length, so a forged token of any shape is
 * simply rejected. Lengths are compared first because timingSafeEqual throws
 * on a length mismatch.
 */
export function isAuthorized(header: string | null, secret: string): boolean {
  if (header === null) {
    return false;
  }

  const expected = `Bearer ${secret}`;

  if (header.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/** Throws the oRPC error that becomes HTTP 401 when the header is not valid. */
export function assertAuthorized(header: string | null, secret: string): void {
  if (!isAuthorized(header, secret)) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "A valid webhook secret is required.",
    });
  }
}
