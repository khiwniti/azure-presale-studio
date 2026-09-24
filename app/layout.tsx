import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Azure Presale Studio",
  description:
    "AI-powered Azure solution architecture diagram generator for presales engineers.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
