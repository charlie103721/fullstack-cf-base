import { serve } from "@hono/node-server";
import worker from "./index";

const DEFAULT_PORT = 8787;

function resolvePort(): number {
  const fromServerPort = Number(process.env.SERVER_PORT);
  if (Number.isFinite(fromServerPort) && fromServerPort > 0) {
    return fromServerPort;
  }

  const fromPort = Number(process.env.PORT);
  if (Number.isFinite(fromPort) && fromPort > 0) {
    return fromPort;
  }

  const authUrl = process.env.BETTER_AUTH_URL;
  if (authUrl) {
    try {
      const parsed = new URL(authUrl);
      const fromAuthUrl = Number(parsed.port);
      if (Number.isFinite(fromAuthUrl) && fromAuthUrl > 0) {
        return fromAuthUrl;
      }
      if (parsed.protocol === "https:") return 443;
      if (parsed.protocol === "http:") return 80;
    } catch {
      // Ignore invalid URL and fallback.
    }
  }

  return DEFAULT_PORT;
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
