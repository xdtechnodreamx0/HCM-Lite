import { randomBytes, randomUUID } from "node:crypto";

export function createId(prefix?: string) {
  const id = randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

export function createToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

export function createTemporaryPassword() {
  return `Tmp-${randomBytes(5).toString("base64url")}`;
}
