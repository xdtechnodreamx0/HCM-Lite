import { z } from "zod";
import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { requireRole } from "@/server/auth/authorization";
import { createDesignation, listDesignations } from "@/server/services/organization.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    const actor = requireApiUser(user);
    requireRole(actor, ["ADMIN", "HR"]);
    return json(await listDesignations(actor.companyId));
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const actor = requireApiUser(user);
    const input = z.object({ name: z.string().trim().min(2).max(80) }).parse(await readJson<unknown>(currentRequest));
    return json(await createDesignation(actor, input.name), 201);
  });
}
