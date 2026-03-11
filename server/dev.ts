import { serve } from "@hono/node-server";
import worker from "./index";

function resolvePort(): number {
  const port = Number(process.env.PORT);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error("PORT env var is required (set by portless)");
  }
  return port;
}

const executionContext = {
  waitUntil: (_promise: Promise<unknown>) => undefined,
  passThroughOnException: () => undefined,
};

const port = resolvePort();

const server = serve(
  {
    port,
    fetch: (request: Request) =>
      worker.fetch(request, {} as CloudflareBindings, executionContext),
  },
  (info) => {
    console.log(`[server] listening on http://localhost:${info.port}`);
  },
);

const shutdown = () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
