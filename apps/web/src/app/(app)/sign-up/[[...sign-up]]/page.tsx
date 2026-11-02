import type { Metadata } from "next";
import { authMetadata } from "../../auth-metadata";
import { AuthScreen } from "../../auth-screen";

export const metadata: Metadata = authMetadata(
  "/sign-up",
  "Create your Beans account and plan your day",
  "Create a Beans account and plan your first day in a few minutes. Then try the whole planner free for 7 days, or 3 days with no card.",
);

export default function SignUpPage() {
  return <AuthScreen kind="sign-up" />;
}
