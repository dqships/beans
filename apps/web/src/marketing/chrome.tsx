/* eslint-disable @next/next/no-html-link-for-pages -- no client runtime here, so links are plain anchors. */
import { MascotMark } from "./art";
import styles from "./chrome.module.css";

/** The header on every public page. */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.brand}>
        <MascotMark size={32} />
        Beans
      </a>
      <nav className={styles.nav} aria-label="Main">
        <a href="/#day" className={styles.navLink}>
          How a day goes
        </a>
        <a href="/pricing" className={styles.navLink}>
          Pricing
        </a>
        <a href="/about" className={styles.navLink}>
          About
        </a>
        <a href="/sign-in" className={styles.signIn}>
          Sign in
        </a>
        <a href="/sign-up" className={styles.primary}>
          Start planning
        </a>
      </nav>
    </header>
  );
}

/** The footer on every public page. */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.footerLine}>
        <MascotMark size={24} lazy />
        Beans, a daily planner.
      </p>
      <nav aria-label="Footer">
        <ul className={styles.footerLinks}>
          <li>
            <a href="/pricing">Pricing</a>
          </li>
          <li>
            <a href="/about">About</a>
          </li>
          <li>
            <a href="/contact">Contact</a>
          </li>
          <li>
            <a href="/privacy">Privacy</a>
          </li>
          <li>
            <a href="/terms">Terms</a>
          </li>
          <li>
            <a href="/sign-in">Sign in</a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}

/** The two calls to action, from voice.md. */
export function Calls({ className }: { className?: string }) {
  return (
    <div className={`${styles.calls} ${className ?? ""}`}>
      <a href="/sign-up" className={styles.primaryLarge}>
        Start planning
      </a>
      <a href="/sign-in" className={styles.secondaryLarge}>
        Sign in
      </a>
    </div>
  );
}
