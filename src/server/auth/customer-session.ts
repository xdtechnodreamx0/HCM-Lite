import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";
import { collections } from "@/server/db/collections";
import type { CustomerSession } from "@/lib/types";

const COOKIE = "hcm_customer";

function secretKey() {
  return new TextEncoder().encode(getEnv().sessionSecret);
}

export async function signCustomerSession(session: CustomerSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.email)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secretKey());
}

export async function setCustomerCookie(session: CustomerSession) {
  const token = await signCustomerSession(session);
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: getEnv().nodeEnv === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearCustomerCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

/**
 * A customer cookie is only accepted while demo mode is enabled and the company
 * is explicitly marked as a seeded demo workspace. This is intentionally not a
 * fourth HCM role and grants no staff API access.
 */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const env = getEnv();
  if (!env.demoMode) return null;
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.kind !== "customer" || payload.demo !== true) return null;
    const db = await collections();
    const company = await db.companies.findOne(
      { id: String(payload.companyId), demoSeed: true },
      { projection: { _id: 0, id: 1 } },
    );
    if (!company) return null;
    return {
      kind: "customer",
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      companyId: String(payload.companyId),
      demo: true,
    };
  } catch {
    return null;
  }
}
