import type { Metadata } from "next";
import { AuthScreen } from "../../auth-screen";

export const metadata: Metadata = { title: "Sign in · Beans" };

export default function SignInPage() {
  return <AuthScreen kind="sign-in" />;
}
