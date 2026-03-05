import type { Hono, Env } from "hono";
import { HTTPException } from "hono/http-exception";
import { fail } from "../util/response";
import logger from "../util/logger";

export const setupErrorHandler = <E extends Env>(app: Hono<E>) => {
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }

    const error = err as Error;
    logger.error("unhandled error", {
      requestId: c.get("requestId") || "unknown",
      error: error.message,
      stack: error.stack,
    });
    return fail(c, "INTERNAL_ERROR", "Internal Server Error", 500);
  });
};
