import { json, withApi } from "@/server/http";
import { listDemoAccounts } from "@/server/services/demo.service";

export async function GET(request: Request) {
  return withApi(request, async () => json(await listDemoAccounts()));
}
