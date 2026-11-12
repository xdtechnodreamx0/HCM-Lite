import { json, readJson, withApi } from "@/server/http";
import { getEnv, isEmailConfigured } from "@/lib/env";
import { setupCompany, setupSchema, isInitialized } from "@/server/services/setup.service";

export async function GET(request: Request) {
  return withApi(request, async () => {
    const env = getEnv();
    return json({
      initialized: await isInitialized(),
      emailConfigured: isEmailConfigured(),
      demoMode: env.demoMode,
    });
  });
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const input = setupSchema.parse(await readJson<unknown>(currentRequest));
    const result = await setupCompany(input);
    return json(result, 201);
  });
}
