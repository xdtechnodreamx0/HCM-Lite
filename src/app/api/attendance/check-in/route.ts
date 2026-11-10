import { json, readOptionalJson, withApi, requireApiUser } from "@/server/http";
import { checkIn } from "@/server/services/attendance.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => {
    const body = await readOptionalJson<unknown>(currentRequest);
    return json(await checkIn(requireApiUser(user), body), 201);
  });
}
