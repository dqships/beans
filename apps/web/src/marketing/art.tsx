import { phoneBreakpoint } from "@beans/tokens";
import styles from "./art.module.css";

/** The task bean from the app's checkbox, with its sprout. */
export function BeanMark() {
  return (
    <svg className={styles.bean} viewBox="0 0 20 20" aria-hidden="true">
      <g className={styles.sprout}>
        <path d="M10.6 3.4 C10.6 2.2 10.9 1.3 11.5 0.5" className={styles.stem} />
        <path d="M11.7 1.4 C12.6 -0.6 14.9 -1.1 16.8 -0.4 C16.3 1.7 13.9 2.6 11.7 1.4 Z" className={styles.leaf} />
        <path d="M11.3 2 C10.2 0.4 8.3 0 6.6 0.7 C7.4 2.5 9.5 3 11.3 2 Z" className={styles.leaf} />
      </g>
      <path
        d="M7 4.3 C9.7 2.7 14.1 3.2 16.1 6.2 C18 9.1 17.3 13.6 14.4 15.8 C11.6 18 6.9 17.9 4.5 15.4 C3 13.8 3.3 12 4.7 11.1 C5.8 10.4 6 9.7 5.3 8.7 C4.2 7.2 5.1 5.4 7 4.3 Z"
        className={styles.body}
      />
    </svg>
  );
}

/** The now marker from the Timebox. */
export function LeafMark({ className }: { className?: string }) {
  return (
    <svg className={`${styles.nowLeaf} ${className ?? ""}`} viewBox="0 0 24 16" aria-hidden="true">
      <path d="M2 8 C6 1 16 0 22 8 C16 16 6 15 2 8 Z" />
      <path d="M4 8 L18 8" className={styles.vein} />
    </svg>
  );
}

/** A small hour leaf that sits on the vine. */
export function VineLeaf({ className }: { className?: string }) {
  return (
    <svg className={`${styles.vineLeaf} ${className ?? ""}`} viewBox="0 0 24 16" aria-hidden="true">
      <path d="M2 8 C6 1 16 0 22 8 C16 16 6 15 2 8 Z" />
    </svg>
  );
}

/** The soil line that draws in under a heading. */
export function SoilLine() {
  return <span className={styles.soil} aria-hidden="true" />;
}

/** The mascot itself, for the header and footer. */
export function MascotMark({ size }: { size: number }) {
  return (
    <picture>
      <source srcSet="/brand/mascot.avif" type="image/avif" />
      <img src="/brand/mascot.webp" alt="" width={size} height={size} className={styles.mascot} />
    </picture>
  );
}

const pairs = (base: string, ext: string, width: number) => `${base}@1x.${ext} ${width}w, ${base}@2x.${ext} ${width * 2}w`;

/** A real screenshot from `public/product`, following the system theme. */
export function ProductShot({
  name,
  width,
  height,
  alt,
  shown,
  className,
}: {
  name: "board" | "timebox" | "phone";
  width: number;
  height: number;
  alt: string;
  /** The widest it appears on a desktop, in CSS pixels. */
  shown: number;
  className?: string;
}) {
  const light = `/product/${name}-light`;
  const dark = `/product/${name}-dark`;
  const sizes = `(max-width: ${phoneBreakpoint}px) 100vw, ${shown}px`;
  return (
    <picture>
      <source media="(prefers-color-scheme: dark)" type="image/avif" srcSet={pairs(dark, "avif", width)} sizes={sizes} />
      <source media="(prefers-color-scheme: dark)" type="image/webp" srcSet={pairs(dark, "webp", width)} sizes={sizes} />
      <source type="image/avif" srcSet={pairs(light, "avif", width)} sizes={sizes} />
      <source type="image/webp" srcSet={pairs(light, "webp", width)} sizes={sizes} />
      <img
        src={`${light}@1x.webp`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={className}
      />
    </picture>
  );
}

/** A mascot pose from `public/illustrations`. */
export function Illustration({
  name,
  width,
  height,
  alt,
  shown,
  className,
}: {
  name: string;
  width: number;
  height: number;
  alt: string;
  shown: number;
  className?: string;
}) {
  const base = `/illustrations/${name}`;
  const sizes = `(max-width: ${phoneBreakpoint}px) 100vw, ${shown}px`;
  return (
    <picture>
      <source type="image/avif" srcSet={pairs(base, "avif", width)} sizes={sizes} />
      <source type="image/webp" srcSet={pairs(base, "webp", width)} sizes={sizes} />
      <img
        src={`${base}@1x.webp`}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        decoding="async"
        className={className}
      />
    </picture>
  );
}
