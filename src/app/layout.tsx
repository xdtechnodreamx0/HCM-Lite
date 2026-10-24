import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/features/app/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "People.works | HCM Lite",
  description: "A calm, practical workspace for people operations, attendance, leave, and payroll.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
