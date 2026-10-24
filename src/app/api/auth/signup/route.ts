import { json, readJson, withApi } from "@/server/http";
import { requestEmployeeSignup } from "@/server/services/auth.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await requestEmployeeSignup(await readJson<unknown>(currentRequest), address), 202);
  });
}
