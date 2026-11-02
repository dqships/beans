"use client";

import { useEffect, useState } from "react";
import { countLine, PLANS, TRIAL_DAYS, type PlanId } from "@beans/core";
import { useBilling } from "@/data/billing";
import { useClock } from "@/data/hooks";
import { Button } from "@/ui/Button";
import { BeanMark, Mascot } from "@/ui/garden";
import { Illustration } from "@/ui/Illustration";
import { useAccount } from "./account";
import styles from "./paywall.module.css";

const DAY = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long" });

/** "9 November" */
function dayMonth(date: Date): string {
  const parts = DAY.formatToParts(date);
  return `${parts.find((p) => p.type === "day")?.value} ${parts.find((p) => p.type === "month")?.value}`;
}

/**
 * Shown instead of the planner until the account has a trial or a
 * subscription: two seed packets, one per plan, and the launch offer when
 * one is running. Checkout happens on Stripe's page.
 */
export function Paywall() {
  const billing = useBilling();
  const account = useAccount();
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = useClock();
  // Coming back from Stripe with the Back button restores this page as it was left.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  if (!billing) return null;
  const { status, offer } = billing;
  const trial = status.trialAvailable;
  // Launch offers are for a first subscription, like the trial.
  const promo = trial ? offer.promo : null;
  const ended = status.status !== null;
  const trialEnds = dayMonth(new Date(now + TRIAL_DAYS * 86_400_000));
  const price = offer.plans.find((p) => p.id === plan)!.price;

  async function run(kind: "checkout" | "portal") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "checkout") await billing!.startCheckout(plan);
      else await billing!.openPortal();
    } catch (e) {
      console.error(e);
      setError(kind === "checkout" ? "Stripe's checkout didn't open. Try again in a minute." : "The billing page didn't open. Try again in a minute.");
      setBusy(null);
    }
  }

  let fine: string;
  if (plan === "monthly" && promo && trial) fine = `${promo.monthlyLine} Your card is needed now. Cancel any time in Settings.`;
  else if (trial) fine = `Free until ${trialEnds}, then ${price}. Your card is needed now, and you won't be charged if you cancel before then in Settings.`;
  else fine = `${price.charAt(0).toUpperCase()}${price.slice(1)}, starting today. Cancel any time in Settings.`;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.brand}>
          <Mascot className={styles.brandMark} />
          Beans
        </span>
        {account.signOut ? (
          <Button variant="quiet" onClick={account.signOut}>
            Sign out
          </Button>
        ) : null}
      </header>
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.words}>
            <h1 className={styles.title}>{ended ? "Your Beans subscription has ended" : trial ? `Try Beans free for ${TRIAL_DAYS} days` : "Choose a plan"}</h1>
            <p className={styles.lead}>
              {ended
                ? "Your tasks are saved. Choose a plan to open your planner again."
                : "Pick a plan to start. You get the whole planner: Brain Dump, the board, the Timebox, timers and analytics."}
            </p>
          </div>
          <Illustration name="welcome" alt="" className={styles.art} eager />
        </div>

        {promo ? (
          <section className={styles.offer} aria-label={promo.label}>
            <p className={styles.offerEdge}>
              {promo.label} · code <strong>{promo.code}</strong>, applied for you
            </p>
            <p className={styles.offerHeadline}>{promo.headline}</p>
            {countLine(promo) ? <p className={styles.offerCount}>{countLine(promo)}</p> : null}
          </section>
        ) : null}

        <div className={styles.packets} role="radiogroup" aria-label="Plan">
          {(["monthly", "yearly"] as const).map((id) => {
            const p = PLANS[id];
            const amount = offer.plans.find((x) => x.id === id)!;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={plan === id}
                className={`${styles.packet} ${id === "yearly" ? styles.yearly : styles.monthly}`}
                onClick={() => setPlan(id)}
              >
                <span className={styles.packetName}>{id === "monthly" ? "Monthly" : "Yearly"}</span>
                <BeanMark done={plan === id} className={styles.packetBean} />
                <span className={styles.packetPrice}>{amount.price.replace(/ a (month|year)$/, "")}</span>
                <span className={styles.packetPer}>a {p.interval}</span>
                <span className={styles.packetNote}>
                  {id === "yearly" ? `Save ${offer.yearlySaving}%` : promo ? promo.headline.replace(" on the monthly plan.", "") : "Cancel any time"}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => void run("checkout")} disabled={busy !== null}>
            {busy === "checkout" ? "Opening Stripe…" : trial ? `Start ${TRIAL_DAYS}-day free trial` : `Subscribe for ${price}`}
          </Button>
          <p className={styles.fine}>{fine}</p>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          {status.hasCustomer && ended ? (
            <Button variant="quiet" onClick={() => void run("portal")} disabled={busy !== null}>
              See invoices and billing
            </Button>
          ) : null}
        </div>

        {offer.pastPromos.length ? (
          <ul className={styles.past}>
            {offer.pastPromos.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </main>
    </div>
  );
}
