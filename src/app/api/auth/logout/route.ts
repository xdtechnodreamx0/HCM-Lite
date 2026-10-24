import { json, withApi } from "@/server/http";
import { logout } from "@/server/services/auth.service";

export async function POST(request: Request) {
  return withApi(request, async () => {
    await logout();
    return json({ loggedOut: true });
  });
}
