import { describe, it, expect } from "vitest";
import { appRouter } from "./router";

const caller = appRouter.createCaller({ env: {} as CloudflareBindings });

describe("appRouter", () => {
  describe("hello", () => {
    it("returns default greeting when no name provided", async () => {
      const result = await caller.hello({});
      expect(result.message).toBe("Hello from Hono!");
      expect(result.timestamp).toBeTypeOf("number");
    });

    it("returns personalized greeting when name provided", async () => {
      const result = await caller.hello({ name: "World" });
      expect(result.message).toBe("Hello from World!");
    });
  });
});
