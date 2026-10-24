import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import type { SessionUser } from "@/lib/types";
import { collections } from "@/server/db/collections";

const COOKIE = "hcm_session";

function secretKey() {
  return new TextEncoder().encode(getEnv().sessionSecret);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function readSessionToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey());
  return payload as unknown as SessionUser;
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getRequestUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await readSessionToken(token);
    const db = await collections();
    const user = await db.users.findOne({ id: session.id, active: true });
    if (!user) return null;
    if (user.sessionVersion !== session.sessionVersion) return null;
    return {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      name: user.name,
      forcePasswordChange: Boolean(user.forcePasswordChange),
      sessionVersion: user.sessionVersion,
    };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getRequestUser();
  if (!user) throw new AppError(401, "Please sign in.");
  return user;
}
