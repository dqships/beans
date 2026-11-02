/* eslint-disable @next/next/no-html-link-for-pages -- no client runtime here, so links are plain anchors. */
import type { GetStaticProps, PageConfig } from "next";
import { countLine, type Offer } from "@beans/core";
import { loadOffer } from "@/data/offer-server";
import { SoilLine } from "@/marketing/art";
import { SiteFooter, SiteHeader } from "@/marketing/chrome";
import { PageHead } from "@/marketing/head";
import { publicPages } from "@/marketing/pages";
import styles from "@/marketing/pricing.module.css";

export const config: PageConfig = { unstable_runtimeJS: false };

/** Rebuilt at most once a minute, so the launch offer's claimed count keeps up. */
export const getStaticProps: GetStaticProps<{ offer: Offer }> = async () => ({ props: { offer: await loadOffer() }, revalidate: 60 });

const INCLUDED = [
  "Brain Dump and Lists for tasks without a date",
  "A board with a column for every day",
  "The Timebox, to give each task a time",
  "Quick Capture, search, filters and shortcuts",
  "Timer and Pomodoro, with actual time",
  "Daily planning and wrap-up",
  "Repeating tasks and templates",
  "Analytics by label",
  "Live sync between your windows",
  "Light and dark themes, and a phone layout",
];

export default function Pricing({ offer }: { offer: Offer }) {
  const monthly = offer.plans.find((p) => p.id === "monthly")!;
  const yearly = offer.plans.find((p) => p.id === "yearly")!;
  const promo = offer.promo;
  return (
    <div className={styles.page}>
      <PageHead page={publicPages.pricing} />
      <SiteHeader />
      <main className={styles.main}>
        <div className={styles.intro}>
          <h1 className={styles.h1}>Try Beans free for {offer.trialDays} days</h1>
          <p className={styles.lead}>
            Then {monthly.price}, or {yearly.price}. Every part of the planner is included, and you can cancel any time.
          </p>
        </div>

        {promo ? (
          <section className={styles.offer} aria-label={promo.label}>
            <p className={styles.offerEdge}>
              {promo.label} · code <strong>{promo.code}</strong>, applied for you at checkout
            </p>
            <p className={styles.offerHeadline}>{promo.headline}</p>
            {countLine(promo) ? <p className={styles.offerEdge}>{countLine(promo)}</p> : null}
          </section>
        ) : null}

        <div className={styles.row}>
          <section className={`${styles.packet} ${styles.monthly}`} aria-labelledby="plan-monthly">
            <h2 id="plan-monthly" className={styles.packetName}>
              Monthly
            </h2>
            <p className={styles.price}>
              {monthly.price.replace(/ a month$/, "")} <span>a month</span>
            </p>
            <p className={styles.note}>{promo ? promo.monthlyLine : `${offer.trialDays} days free, then ${monthly.price}.`}</p>
            <a href="/sign-up" className={styles.cta}>
              Start your free trial
            </a>
          </section>
          <section className={`${styles.packet} ${styles.yearly}`} aria-labelledby="plan-yearly">
            <h2 id="plan-yearly" className={styles.packetName}>
              Yearly
            </h2>
            <p className={styles.price}>
              {yearly.price.replace(/ a year$/, "")} <span>a year</span>
            </p>
            <p className={styles.note}>
              {offer.trialDays} days free, then {yearly.price}. That&apos;s {offer.yearlySaving}% less than paying monthly.
            </p>
            <a href="/sign-up" className={styles.cta}>
              Start your free trial
            </a>
          </section>
        </div>
        <SoilLine />

        <section className={styles.section} aria-labelledby="included">
          <h2 id="included" className={styles.h2}>
            What you get on either plan
          </h2>
          <ul className={styles.included}>
            {INCLUDED.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="trial">
          <h2 id="trial" className={styles.h2}>
            How the free trial works
          </h2>
          <ol className={styles.steps}>
            <li>
              <strong>Sign up and pick a plan.</strong> Stripe, our payment provider, asks for your card. Nothing is charged yet.
            </li>
            <li>
              <strong>Plan your days for {offer.trialDays} days</strong> with everything in Beans.
            </li>
            <li>
              <strong>Your plan starts on day {offer.trialDays + 1}</strong>, unless you cancel in Settings before then. Cancel during the
              trial and you&apos;re never charged.
            </li>
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="questions">
          <h2 id="questions" className={styles.h2}>
            Questions
          </h2>
          <dl className={styles.faq}>
            <dt>How do I cancel?</dt>
            <dd>
              In Beans, open Settings, then Subscription, and press Manage subscription. Beans stays open until the end of the time you
              paid for.
            </dd>
            <dt>Can I switch between monthly and yearly?</dt>
            <dd>Yes, in the same place. Moving to yearly starts right away, with credit for unused time. Moving to monthly starts when your year ends.</dd>
            <dt>What happens to my tasks if I stop paying?</dt>
            <dd>They stay saved. The planner locks until you choose a plan again, then everything is where you left it.</dd>
            <dt>Can I get a refund?</dt>
            <dd>
              Yes. Email <a href="mailto:support@followusai.com">support@followusai.com</a> within 14 days of a charge and we&apos;ll refund it in full.
            </dd>
          </dl>
        </section>

        {offer.pastPromos.length ? (
          <ul className={styles.past}>
            {offer.pastPromos.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
