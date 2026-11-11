import type { Metadata } from "next";
import { ResetPasswordPage } from "@/features/app/components/public-auth-views";

export const metadata: Metadata = {
  title: "Choose a new password | People.works",
  description: "Set a new password for your People.works account.",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordPage token={token ?? ""} />;
}
