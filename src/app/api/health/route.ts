import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await (await getDb()).command({ ping: 1 });
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503 });
  }
}
