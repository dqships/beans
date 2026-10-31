import Link from "next/link";

/** Placeholder until the landing page lands. It stays server-rendered, with no Clerk or Convex code. */
export default function LandingPage() {
  return (
    <main>
      <h1>Beans</h1>
      <p>A daily planner for your tasks, your week and your hours.</p>
      <Link href="/sign-up">Sign up</Link> <Link href="/sign-in">Sign in</Link>
    </main>
  );
}
