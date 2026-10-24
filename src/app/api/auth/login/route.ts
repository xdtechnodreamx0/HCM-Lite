import { json, readJson, withApi } from "@/server/http";
import { login, loginSchema } from "@/server/services/auth.service";

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const input = loginSchema.parse(await readJson<unknown>(currentRequest));
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    const user = await login(input, address);
    return json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, employeeId: user.employeeId, forcePasswordChange: user.forcePasswordChange } });
  });
}
