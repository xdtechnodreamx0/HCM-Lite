import { json, withApi, requireApiUser } from "@/server/http";
import { listMyNotifications } from "@/server/services/communications.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => json(await listMyNotifications(requireApiUser(user))));
}
