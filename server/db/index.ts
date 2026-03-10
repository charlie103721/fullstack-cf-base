import { createMiddleware } from "hono/factory";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { isDev } from "../config";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

export let db: DB;

let devClient: pg.Pool | null = null;

/**
 * Initializes the db connection per request.
 * - Dev: reuses a single Pool (stable DATABASE_URL)
 * - Production: creates a fresh Pool per request because Hyperdrive
 *   manages connection pooling and stale TCP connections in a long-lived
 *   pool cause unhandled errors (Cloudflare error 1101) that crash the Worker.
 */
export const dbMiddleware = createMiddleware<{
  Bindings: CloudflareBindings;
}>(async (c, next) => {
  if (isDev) {
    if (!devClient) {
      devClient = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
    }
    db = drizzle(devClient, { schema });
  } else {
    const client = new pg.Pool({
      connectionString: c.env.HYPERDRIVE.connectionString,
      max: 1,
    });
    db = drizzle(client, { schema });
    await next();
    await client.end();
    return;
  }
  await next();
});
