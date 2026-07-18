import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;

  return {
    title: "StrideOS · Shared Athlete & Coach Demo",
    description: "A synthetic, privacy-safe preview of the ChatGPT-native StrideOS coaching flow.",
    openGraph: {
      title: "StrideOS",
      description: "One plan. Two perspectives. Athlete in control.",
      images: [{ url: image, width: 1736, height: 907, alt: "StrideOS shared athlete and coach training plan" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "StrideOS",
      description: "One plan. Two perspectives. Athlete in control.",
      images: [image],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
