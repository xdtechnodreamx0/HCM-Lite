import type { Metadata } from "next";
import { HcmPortal } from "@/features/app/components/hcm-portal";

export const metadata: Metadata = {
  title: "Sign in | People.works",
  description: "Sign in to your private People.works HCM workspace.",
};

export default function LoginPage() {
  return <HcmPortal />;
}
