import { json, readJson, withApi } from "@/server/http";
import { getCustomerSession } from "@/server/auth/customer-session";
import { clearCustomerSession, createCustomerSession, customerBootstrap } from "@/server/services/customer.service";

export async function GET(request: Request) {
  return withApi(request, async () => {
    const session = await getCustomerSession();
    return json(await customerBootstrap(session));
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const forwarded = currentRequest.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const address = forwarded || currentRequest.headers.get("x-real-ip") || "unknown";
    return json(await createCustomerSession(await readJson<unknown>(currentRequest), address), 201);
  });
}

export async function DELETE(request: Request) {
  return withApi(request, async () => json(await clearCustomerSession()));
}
