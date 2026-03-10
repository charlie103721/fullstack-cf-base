import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";

const SELECTED_FIELDS = {
  id: users.id,
  email: users.email,
  name: users.name,
  createdAt: users.createdAt,
} as const;

export const findAll = () =>
  db.select(SELECTED_FIELDS).from(users).orderBy(desc(users.createdAt));

export const findByEmail = (email: string) =>
  db.select().from(users).where(eq(users.email, email)).then((rows) => rows[0] ?? null);

export const insert = (user: { id: string; email: string; name: string }) =>
  db.insert(users).values(user).returning(SELECTED_FIELDS);
