import type { Metadata } from "next";
import { SignupPage } from "@/features/app/components/public-auth-views";

export const metadata: Metadata = {
  title: "Request access | People.works",
  description: "Request an employee login for your company’s People.works workspace.",
};

export default function Page() {
  return <SignupPage />;
}
