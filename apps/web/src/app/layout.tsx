import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { authMode } from "@/data/auth-mode";
import { BackendProviders } from "@/data/providers";
import { ThemeScript } from "./theme-script";
import "./globals.css";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beans",
  description: "A daily planner for your tasks, your week and your hours.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        {authMode === "clerk" ? (
          <ClerkProvider
            appearance={{
              variables: {
                colorPrimary: "var(--color-primary)",
                colorBackground: "var(--color-surface)",
                colorForeground: "var(--color-text)",
                colorMutedForeground: "var(--color-text-muted)",
                colorPrimaryForeground: "var(--color-on-primary)",
                colorInput: "var(--color-surface)",
                colorInputForeground: "var(--color-text)",
                colorBorder: "var(--color-border)",
                colorDanger: "var(--color-danger)",
                fontFamily: "var(--font-sans)",
                borderRadius: "var(--radius-sm)",
              },
            }}
          >
            <BackendProviders>{children}</BackendProviders>
          </ClerkProvider>
        ) : (
          <BackendProviders>{children}</BackendProviders>
        )}
      </body>
    </html>
  );
}
