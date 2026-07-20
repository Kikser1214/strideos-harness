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
  title: "StrideOS - Five-skill endurance coaching plugin",
  description: "Install five local-first ChatGPT Work and Codex coaching skills for training, data, fueling, and a private human coach room.",
  openGraph: {
    title: "StrideOS - Train with AI. Keep your people in the loop.",
    description: "An installable open-source ChatGPT Work and Codex plugin with five coaching skills and an athlete-controlled room for real human feedback.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "StrideOS five-skill endurance coaching plugin" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrideOS - Five-skill endurance coaching plugin",
    description: "Installable, local-first coaching skills for runners.",
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
