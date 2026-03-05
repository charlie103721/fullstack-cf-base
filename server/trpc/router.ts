import { router, publicProcedure, protectedProcedure } from "./trpc";
import { z } from "zod/v4";
import { createUserInput } from "../features/users/schema";
import * as UserService from "../features/users/service";

// Inlined tRPC procedures — keeps AppRouter type available for the client
// until Phase 2 migrates to plain fetch. The actual HTTP routes are now
// served by Hono (see server/features/*/router.ts).
const helloRouter = publicProcedure
  .input(z.object({ name: z.optional(z.string()) }))
  .query(({ input }) => {
    const name = input.name ?? "Hono";
    return { message: `Hello from ${name}!`, timestamp: Date.now() };
  });

const usersRouter = router({
  list: protectedProcedure.query(() => UserService.list()),
  create: protectedProcedure
    .input(createUserInput)
    .mutation(({ input }) => UserService.create(input)),
});

export const appRouter = router({
  hello: helloRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
