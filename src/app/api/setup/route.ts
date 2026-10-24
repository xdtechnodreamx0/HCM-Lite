import { json, readJson, withApi } from "@/server/http";
import { setupCompany, setupSchema, isInitialized } from "@/server/services/setup.service";

export async function GET(request: Request) {
  return withApi(request, async () => json({ initialized: await isInitialized() }));
}

export async function POST(request: Request) {
  return withApi(request, async ({ request: currentRequest }) => {
    const input = setupSchema.parse(await readJson<unknown>(currentRequest));
    const result = await setupCompany(input);
    return json(result, 201);
  });
}
