import { json, readJson, withApi } from "@/server/http";
import { signupCompany } from "@/server/services/tenant.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await signupCompany(await readJson<unknown>(currentRequest), address), 202);
  });
}
