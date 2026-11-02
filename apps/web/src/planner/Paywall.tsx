"use client";

import { useEffect, useState } from "react";
import { CaretRight } from "@phosphor-icons/react";
import { addDays, countLine, money, PASS_DAYS, PLANS, TRIAL_DAYS, type PlanId, type Task } from "@beans/core";
import { useBilling } from "@/data/billing";
import { useClock, useDayTasks, useListTasks, useOnboarding, useToday } from "@/data/hooks";
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
  // Null until the buyer picks: then the default follows the launch offer.
  const [picked, setPlan] = useState<PlanId | null>(null);
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
  // Launch codes discount the monthly plan, so it leads while one runs; otherwise yearly, the better deal.
  const plan: PlanId = picked ?? (promo ? "monthly" : "yearly");
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

  const due = trial ? `$0 due today. Free until ${trialEnds}.` : `${price.charAt(0).toUpperCase()}${price.slice(1)}, starting today.`;
  const secure = "You'll add your card on Stripe's secure checkout page.";
  let fine: string;
  if (plan === "monthly" && promo && trial) fine = `${promo.monthlyLine} Cancel any time in Settings. ${secure}`;
  else if (trial) fine = `Then ${price}. Cancel in Settings before ${trialEnds} and you won't be charged. ${secure}`;
  else fine = `Cancel any time in Settings. ${secure}`;

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

        <YourPlan />

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
                <span className={styles.packetPer}>{id === "yearly" ? `a year, ${money(amount.amount / 12, amount.currency)} a month` : `a ${p.interval}`}</span>
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
          <p className={styles.due}>{due}</p>
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

        <FounderNote price={offer.plans.find((x) => x.id === "monthly")!.price} />

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

const PREVIEW = 3;

/**
 * The account's own tasks, so the paywall shows what it keeps: the next day
 * with tasks, a few of them, and the Brain Dump count. Nothing for an account
 * with no tasks.
 */
function YourPlan() {
  const today = useToday();
  const tomorrow = addDays(today, 1);
  const todays = useDayTasks(today);
  const tomorrows = useDayTasks(tomorrow);
  const dump = useListTasks(null);
  const [word, tasks]: [string, Task[]] = todays.length ? ["today", todays] : ["tomorrow", tomorrows];
  if (!tasks.length && !dump.length) return null;
  const more = tasks.length - PREVIEW;
  return (
    <section className={styles.plan} aria-label="Your plan">
      <h2 className={styles.planTitle}>
        {tasks.length ? `Saved for ${word}` : "Saved in your Brain Dump"}
        <span className={styles.planCount}>{tasks.length || dump.length}</span>
      </h2>
      {tasks.length ? (
        <ul className={styles.planTasks}>
          {tasks.slice(0, PREVIEW).map((task) => (
            <li key={task.id} className={styles.planTask}>
              <BeanMark done={task.done} className={styles.planBean} />
              <span className={styles.planText}>{task.title}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {more > 0 || (tasks.length && dump.length) ? (
        <p className={styles.planMore}>
          {[more > 0 ? `${more} more for ${word}` : null, tasks.length && dump.length ? `${dump.length} in your Brain Dump` : null].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </section>
  );
}

/** Why Beans costs what it does, in DQ's words. Closed until asked. */
function FounderNote({ price }: { price: string }) {
  return (
    <details className={styles.note}>
      <summary className={styles.noteSummary}>
        {/* A small static photo; next/image would add nothing at 40px. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/people/dq.webp" alt="" width={40} height={40} className={styles.notePhoto} />
        <span className={styles.noteLabel}>{`Why Beans costs ${price}`}</span>
        <CaretRight size={16} className={styles.noteCaret} aria-hidden />
      </summary>
      <div className={styles.noteBody}>
        <p>
          Hi, I&apos;m DaQuan. I built Beans because I&apos;m terrible at managing my time. I wanted an easier way to stay on track with the things I need to do,
          whether that&apos;s growing my business, getting to work on time, or staying in touch with family and friends.
        </p>
        <p>There are a lot of daily planners out there, but I wanted one with the features I value at a price that&apos;s fair.</p>
        <p>
          What you pay keeps the servers running and your planner stored securely. It also means I can afford to keep looking after Beans and keep shipping updates.
          I don&apos;t sell your information or use it for advertising.
        </p>
        <p className={styles.noteSign}>DaQuan Louden, who makes Beans</p>
      </div>
    </details>
  );
}
