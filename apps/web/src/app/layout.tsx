import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISP ERP — Billing & Operations Platform",
  description: "Comprehensive ISP management platform for customer operations, billing, collections, accounting, and operational analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
