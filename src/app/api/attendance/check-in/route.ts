import { json, withApi, requireApiUser } from "@/server/http";
import { checkIn } from "@/server/services/attendance.service";

export async function POST(request: Request) {
  return withApi(request, async ({ user }) => json(await checkIn(requireApiUser(user)), 201));
}
