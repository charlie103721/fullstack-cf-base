import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { helloRoutes } from "./router";

const app = new Hono();
app.route("/api/hello", helloRoutes);

describe("GET /api/hello", () => {
  it("returns default greeting when no name provided", async () => {
    const res = await app.request("/api/hello");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { message: string; timestamp: number };
    expect(json.message).toBe("Hello from Hono!");
    expect(json.timestamp).toBeTypeOf("number");
  });

  it("returns personalized greeting when name provided", async () => {
    const res = await app.request("/api/hello?name=World");
    expect(res.status).toBe(200);
    const json = (await res.json()) as { message: string };
    expect(json.message).toBe("Hello from World!");
  });
});
