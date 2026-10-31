import type { Metadata } from "next";
import { AuthScreen } from "../../auth-screen";

export const metadata: Metadata = { title: "Create your account · Beans" };

export default function SignUpPage() {
  return <AuthScreen kind="sign-up" />;
}
