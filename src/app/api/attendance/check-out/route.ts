import { json, withApi, requireApiUser } from "@/server/http";
import { checkOut } from "@/server/services/attendance.service";

export async function POST(request: Request) {
  return withApi(request, async ({ user }) => json(await checkOut(requireApiUser(user))));
}
