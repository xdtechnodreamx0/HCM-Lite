import type { NextConfig } from "next";
import { secureHeaders } from "./src/server/security/secure-headers";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: Object.entries(secureHeaders()).map(([key, value]) => ({ key, value })) }];
  },
};

export default nextConfig;
