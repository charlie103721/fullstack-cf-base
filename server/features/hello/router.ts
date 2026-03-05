import { Hono } from "hono";

const DEFAULT_NAME = "Hono";

const helloRoutes = new Hono();

helloRoutes.get("/", (c) => {
  const name = c.req.query("name") || DEFAULT_NAME;
  return c.json({ message: `Hello from ${name}!`, timestamp: Date.now() });
});

export { helloRoutes };
