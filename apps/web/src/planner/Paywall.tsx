"use client";

import { useEffect, useState } from "react";
import { countLine, PASS_DAYS, PLANS, TRIAL_DAYS, type PlanId } from "@beans/core";
import { useBilling } from "@/data/billing";
import { useClock, useOnboarding } from "@/data/hooks";
import { Button } from "@/ui/Button";
import { BeanMark, Mascot } from "@/ui/garden";
import { Illustration } from "@/ui/Illustration";
import { useAccount } from "./account";
import styles from "./paywall.module.css";

const DAY = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long" });
const MOMENT = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

/** "9 November" */
function dayMonth(date: Date): string {
  const parts = DAY.formatToParts(date);
  return `${parts.find((p) => p.type === "day")?.value} ${parts.find((p) => p.type === "month")?.value}`;
}

/**
 * Shown instead of the planner until the account has a trial or a
 * subscription, after first-run setup for a new account: two seed packets,
 * one per plan, and the launch offer when one is running. Checkout happens on
 * Stripe's page.
 */
export function Paywall() {
  const billing = useBilling();
  const account = useAccount();
  const planned = useOnboarding()?.status === "finished";
  const [plan, setPlan] = useState<PlanId>("monthly");
  const [view, setView] = useState<"plans" | "pass">("plans");
  const [busy, setBusy] = useState<"checkout" | "portal" | "pass" | null>(null);
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
  const passOver = !ended && status.passEnd !== null;
  const trialEnds = dayMonth(new Date(now + TRIAL_DAYS * 86_400_000));
  const price = offer.plans.find((p) => p.id === plan)!.price;

  async function run(kind: "checkout" | "portal" | "pass") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "checkout") await billing!.startCheckout(plan);
      else if (kind === "portal") await billing!.openPortal();
      // The planner opens as soon as the free days are saved.
      else await billing!.startPass();
    } catch (e) {
      console.error(e);
      setError(
        kind === "checkout"
          ? "Stripe's checkout didn't open. Try again in a minute."
          : kind === "portal"
            ? "The billing page didn't open. Try again in a minute."
            : "The free days didn't start. Try again in a minute.",
      );
      setBusy(null);
    }
  }

  const header = (
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
  );

  if (view === "pass") {
    const passEnds = MOMENT.format(new Date(now + PASS_DAYS * 86_400_000));
    return (
      <div className={styles.page}>
        {header}
        <main className={styles.main}>
          <div className={styles.intro}>
            <div className={styles.words}>
              <h1 className={styles.title}>{`${PASS_DAYS} days free, no card`}</h1>
              <p className={styles.lead}>Use all of Beans before you decide. There&apos;s no card to add, so nothing can charge you when the days end.</p>
            </div>
            <Illustration name="welcome" alt="" className={styles.art} eager />
          </div>

          <ol className={styles.steps}>
            <li className={styles.step}>
              <BeanMark done className={styles.stepBean} />
              <span className={styles.stepWhen}>Today</span>
              <span className={styles.stepWhat}>Your planner opens with everything you just planned.</span>
            </li>
            <li className={styles.step}>
              <BeanMark done={false} className={styles.stepBean} />
              <span className={styles.stepWhen}>{passEnds}</span>
              <span className={styles.stepWhat}>{`Beans comes back to this page until you pick a plan. Every task stays saved, and the ${TRIAL_DAYS}-day trial is still yours.`}</span>
            </li>
          </ol>

          <div className={styles.actions}>
            <Button variant="primary" onClick={() => void run("pass")} disabled={busy !== null}>
              {busy === "pass" ? "Starting…" : `Start ${PASS_DAYS} free days`}
            </Button>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <Button
              variant="quiet"
              onClick={() => {
                setError(null);
                setView("plans");
              }}
              disabled={busy !== null}
            >
              Back to plans
            </Button>
          </div>
        </main>
      </div>
    );
  }

  let fine: string;
  if (plan === "monthly" && promo && trial) fine = `${promo.monthlyLine} Your card is needed now. Cancel any time in Settings.`;
  else if (trial) fine = `Free until ${trialEnds}, then ${price}. Your card is needed now, and you won't be charged if you cancel before then in Settings.`;
  else fine = `${price.charAt(0).toUpperCase()}${price.slice(1)}, starting today. Cancel any time in Settings.`;

  return (
    <div className={styles.page}>
      {header}
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.words}>
            <h1 className={styles.title}>
              {ended ? "Your Beans subscription has ended" : passOver ? "Your free days are over" : trial ? `Try Beans free for ${TRIAL_DAYS} days` : "Choose a plan"}
            </h1>
            <p className={styles.lead}>
              {ended
                ? "Your tasks are saved. Choose a plan to open your planner again."
                : passOver
                  ? `Your tasks are saved. Start the ${TRIAL_DAYS}-day trial or pick a plan to keep planning.`
                  : planned
                  ? "Everything you just planned is saved. Pick a plan to open it in the planner, with the board, the Timebox, timers and analytics."
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
          {status.passAvailable ? (
            <Button
              variant="quiet"
              onClick={() => {
                setError(null);
                setView("pass");
              }}
              disabled={busy !== null}
            >
              {`Not ready to add a card? Try ${PASS_DAYS} days free`}
            </Button>
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
