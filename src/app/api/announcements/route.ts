import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { createAnnouncement, listAnnouncements } from "@/server/services/communications.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => json(await listAnnouncements(requireApiUser(user))));
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => json(await createAnnouncement(requireApiUser(user), await readJson<unknown>(currentRequest)), 201));
}
