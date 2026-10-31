"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignIn, SignUp } from "@clerk/nextjs";
import { authMode } from "@/data/auth-mode";
import { setTestUser } from "@/data/test-auth-client";
import { Button } from "@/ui/Button";
import { TextInput } from "@/ui/controls";
import { Mascot } from "@/ui/garden";
import styles from "./auth.module.css";

export function AuthScreen({ kind }: { kind: "sign-in" | "sign-up" }) {
  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <Mascot scene="water" className={styles.mascot} />
        <h1 className={styles.title}>{kind === "sign-in" ? "Welcome back to Beans" : "Start your bean garden"}</h1>
        <p className={styles.lede}>Plan the day, give your tasks a time, and watch them grow.</p>
        {authMode === "clerk" ? (
          <Suspense>
            {kind === "sign-in" ? <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/" /> : <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/" />}
          </Suspense>
        ) : authMode === "test" ? (
          <TestSignIn />
        ) : authMode === "sample" ? (
          <div className={styles.card}>
            <p className={styles.lede}>No sign-in is set up on this machine, so Beans runs on sample data.</p>
            <Link className={styles.link} href="/">
              Open the sample planner
            </Link>
          </div>
        ) : (
          <div className={styles.card}>
            <p className={styles.lede}>Sign-in isn&apos;t set up for this site yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}

/** Local test sign-in. Only reachable in development builds with test auth turned on. */
function TestSignIn() {
  const router = useRouter();
  const [name, setName] = useState("");
  return (
    <form
      className={styles.card}
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setTestUser(name.trim());
        router.replace("/");
      }}
    >
      <p className={styles.note}>Test sign-in for local development. It doesn&apos;t exist in production.</p>
      <label className={styles.label} htmlFor="test-name">
        Your name
      </label>
      <TextInput id="test-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam Gardener" />
      <Button type="submit" variant="primary" disabled={!name.trim()}>
        Sign in
      </Button>
    </form>
  );
}
