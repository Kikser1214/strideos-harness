import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StrideOS - Six-skill endurance coaching plugin",
  description: "Install six ChatGPT and Codex coaching skills for running, strength, fueling, clear approvals, and a Training Circle.",
  openGraph: {
    title: "StrideOS - The AI coach that asks first.",
    description: "Six coaching skills for running, strength, fueling, explicit approval, and real human review.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "StrideOS six-skill endurance coaching plugin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrideOS - The AI coach that asks first.",
    description: "Your training. Your data. Your call.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
