import { ResetPasswordPage } from "@/features/app/components/public-auth-views";

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return <ResetPasswordPage token={token ?? ""} />;
}
