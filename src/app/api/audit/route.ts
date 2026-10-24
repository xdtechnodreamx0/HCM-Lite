import { json, withApi, requireApiUser } from "@/server/http";
import { listAuditForAdmin } from "@/server/services/communications.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => json(await listAuditForAdmin(requireApiUser(user))));
}
