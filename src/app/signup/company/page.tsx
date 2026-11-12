import type { Metadata } from "next";
import { CompanySignupPage } from "@/features/app/components/public-auth-views";

export const metadata: Metadata = {
  title: "Create a company workspace | People.works",
  description: "Start a new company workspace with a verified Admin account.",
};

export default function Page() {
  return <CompanySignupPage />;
}
