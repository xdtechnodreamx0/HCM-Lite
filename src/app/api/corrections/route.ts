import { json, readJson, withApi, requireApiUser } from "@/server/http";
import { listCorrections, requestCorrection } from "@/server/services/attendance.service";

export async function GET(request: Request) {
  return withApi(request, async ({ user }) => json(await listCorrections(requireApiUser(user))));
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest, user }) => json(await requestCorrection(requireApiUser(user), await readJson<unknown>(currentRequest)), 201));
}
