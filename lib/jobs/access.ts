import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

const OWNER_COOKIE = "batch_jobs_owner";

export async function getOwnerId(create = false): Promise<string | null> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(OWNER_COOKIE)?.value;
  if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
  if (!create) return null;

  const ownerId = randomUUID();
  cookieStore.set(OWNER_COOKIE, ownerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return ownerId;
}
