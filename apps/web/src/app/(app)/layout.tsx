import { ClerkProvider } from "@clerk/nextjs";
import { authMode } from "@/data/auth-mode";
import { BackendProviders } from "@/data/providers";
import styles from "./app-shell.module.css";

/** Sign-in and the planner. The marketing pages stay out of this layout, so they ship no Clerk or Convex code. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
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
    </div>
  );
}
