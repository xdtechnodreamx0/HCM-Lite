import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/features/app/components/public-auth-views";

export const metadata: Metadata = {
  title: "Reset your password | People.works",
  description: "Request a secure, single-use password reset link.",
};

export default function Page() {
  return <ForgotPasswordPage />;
}
