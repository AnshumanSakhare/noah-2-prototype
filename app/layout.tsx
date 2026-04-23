import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Space_Mono } from "next/font/google";

import "./globals.css";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700"],
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  weight: ["400", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Diagnostic Agent",
  description: "Interactive diagnostic agent app for quiz-based assessment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "min-h-full antialiased",
        dmSans.variable,
        bricolage.variable,
        spaceMono.variable,
      )}
    >
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
