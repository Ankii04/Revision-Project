import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "DSA Revision — Spaced Repetition for Developers",
    template: "%s | DSA Revision",
  },
  description:
    "Import your LeetCode and GFG solutions, get AI-powered notes, and revise with spaced repetition. Build interview-ready muscle memory.",
  keywords: [
    "DSA",
    "LeetCode",
    "spaced repetition",
    "coding interview",
    "algorithm revision",
  ],
  authors: [{ name: "DSA Revision" }],
  openGraph: {
    type: "website",
    title: "DSA Revision Platform",
    description: "Revise DSA problems with AI notes and spaced repetition",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body className="antialiased bg-background text-foreground">
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
