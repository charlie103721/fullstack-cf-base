import type { Context, Next } from "hono";
import { verifyJWT, getJwtSecret, type JWTPayload } from "../lib/auth";

declare module "hono" {
  interface ContextVariableMap {
    user: JWTPayload | null;
  }
}

/**
 * Non-blocking JWT middleware.
 * Sets `c.var.user` to the decoded payload if a valid Bearer token is present,
 * or `null` otherwise. Does NOT return 401 — that's left to the authGuard middleware.
 */
export const jwtAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    c.set("user", null);
    return next();
  }

  const token = authHeader.substring(7);
  const secret = getJwtSecret(c as Context<{ Bindings: CloudflareBindings }>);
  const payload = await verifyJWT(token, secret);

  c.set("user", payload);
  await next();
};
