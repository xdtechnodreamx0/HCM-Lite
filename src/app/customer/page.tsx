import type { Metadata } from "next";
import { CustomerPortal } from "@/features/app/components/customer-portal";

export const metadata: Metadata = {
  title: "Customer demo | People.works",
  description: "Explore a read-only customer view of a demo people workspace.",
};

export default function Page() {
  return <CustomerPortal />;
}
