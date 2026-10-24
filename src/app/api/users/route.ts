import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { createLogin, listUsers } from "@/server/services/auth.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => json(await listUsers(requireApiUser(user))));
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    const input = z.object({ name: z.string().trim().min(2).max(80), email: z.email(), role: z.enum(["HR", "ADMIN"]).default("HR") }).strict().parse(await readJson<unknown>(currentRequest));
    return json(await createLogin({ actor, ...input }), 201);
  });
}
