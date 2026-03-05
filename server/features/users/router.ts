import { Hono } from "hono";
import { authGuard } from "../../middleware/authGuard";
import * as UserService from "./service";
import { createUserInput } from "./schema";

const usersRoutes = new Hono();

usersRoutes.use("*", authGuard);

usersRoutes.get("/", async (c) => {
  const users = await UserService.list();
  return c.json(users);
});

usersRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createUserInput.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400);
  }
  const user = await UserService.create(parsed.data);
  return c.json(user, 201);
});

export { usersRoutes };
