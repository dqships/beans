import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { siteUrl, themeColors } from "@/lib/site";
import { ThemeScript } from "./theme-script";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Beans",
  description: "A daily planner for your tasks, your week and your hours.",
  openGraph: {
    type: "website",
    siteName: "Beans",
    images: [{ url: "/social/og-image.png", width: 1200, height: 630, alt: "The Beans mascot and name" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/social/twitter-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColors.light },
    { media: "(prefers-color-scheme: dark)", color: themeColors.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
