import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { sign, verify } from "hono/jwt";
import type { Context } from "hono";
import { isDev } from "../config";

// Session config
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 14; // 14 days
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24; // 1 day
const COOKIE_CACHE_MAX_AGE_SECONDS = 60 * 5; // 5 minutes

// JWT config
const JWT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

// PBKDF2 password hashing — fast enough for Workers free tier CPU limits
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const PBKDF2_KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes
const PBKDF2_PREFIX = "pbkdf2:";

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

async function pbkdf2Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    key,
    PBKDF2_KEY_LENGTH,
  );
  return `${PBKDF2_PREFIX}${toHex(salt)}:${toHex(derived)}`;
}

async function pbkdf2Verify(stored: string, password: string): Promise<boolean> {
  const unprefixed = stored.slice(PBKDF2_PREFIX.length);
  const [saltHex, hashHex] = unprefixed.split(":");
  if (!saltHex || !hashHex) return false;
  const encoder = new TextEncoder();
  const salt = fromHex(saltHex);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: PBKDF2_HASH },
    key,
    PBKDF2_KEY_LENGTH,
  );
  return toHex(derived) === hashHex;
}

async function verifyPassword({ hash, password }: { hash: string; password: string }): Promise<boolean> {
  if (!hash.startsWith(PBKDF2_PREFIX)) return false;
  return pbkdf2Verify(hash, password);
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  exp: number;
}

interface AuthEnv {
  betterAuthSecret: string;
  betterAuthUrl: string;
  githubClientId?: string;
  githubClientSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  clientUrl?: string;
}

function createAuthInstance(connectionString: string, env: AuthEnv) {
  return betterAuth({
    secret: env.betterAuthSecret,
    baseURL: env.betterAuthUrl,
    basePath: "/api/auth",
    database: new Pool({ connectionString }),
    emailAndPassword: {
      enabled: true,
      password: { hash: pbkdf2Hash, verify: verifyPassword },
    },
    socialProviders: {
      github: {
        clientId: env.githubClientId || "",
        clientSecret: env.githubClientSecret || "",
      },
      google: {
        clientId: env.googleClientId || "",
        clientSecret: env.googleClientSecret || "",
      },
    },
    trustedOrigins: isDev
      ? ["http://localhost:*", "https://*.localhost:*"]
      : [env.clientUrl!],
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_SECONDS },
    },
    advanced: {
      generateId: () => crypto.randomUUID(),
    },
  });
}

// Cached instance for dev (avoid re-creating on every request)
let cachedAuth: ReturnType<typeof betterAuth> | null = null;

export function getAuth(c: Context<{ Bindings: CloudflareBindings }>) {
  if (isDev) {
    cachedAuth ??= createAuthInstance(process.env.DATABASE_URL!, {
      betterAuthSecret: process.env.BETTER_AUTH_SECRET!,
      betterAuthUrl: process.env.BETTER_AUTH_URL!,
      githubClientId: process.env.GITHUB_CLIENT_ID,
      githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      clientUrl: process.env.CLIENT_URL,
    });
    return cachedAuth;
  }

  // Production: per-request (Hyperdrive manages pooling)
  return createAuthInstance(c.env.HYPERDRIVE.connectionString, {
    betterAuthSecret: c.env.BETTER_AUTH_SECRET,
    betterAuthUrl: c.env.BETTER_AUTH_URL,
    githubClientId: c.env.GITHUB_CLIENT_ID,
    githubClientSecret: c.env.GITHUB_CLIENT_SECRET,
    googleClientId: c.env.GOOGLE_CLIENT_ID,
    googleClientSecret: c.env.GOOGLE_CLIENT_SECRET,
    clientUrl: c.env.CLIENT_URL,
  });
}

// JWT utilities (async — uses Web Crypto API for Cloudflare Workers)
export function getJwtSecret(
  c: Context<{ Bindings: CloudflareBindings }>,
): string {
  return isDev ? process.env.BETTER_AUTH_SECRET! : c.env.BETTER_AUTH_SECRET;
}

export async function generateJWT(
  payload: Omit<JWTPayload, "exp">,
  secret: string,
): Promise<string> {
  return sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_IN_SECONDS },
    secret,
  );
}

export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  try {
    return (await verify(token, secret, "HS256")) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export type Auth = ReturnType<typeof betterAuth>;
