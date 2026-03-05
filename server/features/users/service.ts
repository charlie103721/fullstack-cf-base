import { HTTPException } from "hono/http-exception";
import * as UserRepo from "./repo";
import type { CreateUserInput } from "./schema";

export const list = () => UserRepo.findAll();

export const create = async (input: CreateUserInput) => {
  const existing = await UserRepo.findByEmail(input.email);
  if (existing) {
    throw new HTTPException(409, { message: "Email already taken" });
  }

  const id = crypto.randomUUID();
  const [user] = await UserRepo.insert({ id, ...input });
  return user;
};
