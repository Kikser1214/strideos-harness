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
  title: "StrideOS — Open-source agentic coaching",
  description:
    "A rule-governed AI coaching harness that connects training, recovery, nutrition, and real life into one explainable plan.",
  openGraph: {
    title: "StrideOS — Your training, finally connected.",
    description:
      "Open-source agentic coaching for runners, with every important decision under athlete control.",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "StrideOS open-source agentic coaching" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "StrideOS — Your training, finally connected.",
    description: "Open-source agentic coaching for runners.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
