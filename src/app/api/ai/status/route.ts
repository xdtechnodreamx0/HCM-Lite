import { json, withApi, requireApiUser } from "@/server/http";
import { assistantStatus } from "@/server/services/ai.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => {
    requireApiUser(user);
    return json(await assistantStatus());
  });
}
