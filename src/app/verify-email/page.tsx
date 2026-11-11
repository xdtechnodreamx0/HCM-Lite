import type { Metadata } from "next";
import { VerifyEmailPage } from "@/features/app/components/public-auth-views";

export const metadata: Metadata = {
  title: "Verify your email | People.works",
  description: "Confirm the email address for your People.works account.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <VerifyEmailPage token={token ?? ""} />;
}
