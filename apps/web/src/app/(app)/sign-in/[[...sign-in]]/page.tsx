import type { Metadata } from "next";
import { authMetadata } from "../../auth-metadata";
import { AuthScreen } from "../../auth-screen";

export const metadata: Metadata = authMetadata(
  "/sign-in",
  "Sign in to Beans, your daily planner",
  "Sign in to Beans to open your planner: your Brain Dump, your week on the board and your day in the Timebox, synced on every device.",
);

export default function SignInPage() {
  return <AuthScreen kind="sign-in" />;
}
