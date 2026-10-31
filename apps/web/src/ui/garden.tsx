"use client";

import styles from "./garden.module.css";

/** The mascot's bean outline, reused at small sizes. viewBox units, not pixels. */
const BEAN_PATH =
  "M278 126 C346 126 402 182 402 256 C402 350 306 462 196 462 C136 462 92 414 92 354 C92 306 128 270 176 266 C198 264 208 248 198 232 C184 214 176 196 180 178 C188 148 228 126 278 126 Z";

/** Task checkbox: a bean outline that fills in and grows a sprout when done. */
export function BeanCheckbox({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.bean} ${size === "sm" ? styles.beanSmall : ""} ${checked ? styles.beanDone : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <g className={styles.sprout}>
          <path d="M10.6 3.4 C10.6 2.2 10.9 1.3 11.5 0.5" className={styles.stem} />
          <path d="M11.7 1.4 C12.6 -0.6 14.9 -1.1 16.8 -0.4 C16.3 1.7 13.9 2.6 11.7 1.4 Z" className={styles.leaf} />
          <path d="M11.3 2 C10.2 0.4 8.3 0 6.6 0.7 C7.4 2.5 9.5 3 11.3 2 Z" className={styles.leaf} />
        </g>
        <path d="M7 4.3 C9.7 2.7 14.1 3.2 16.1 6.2 C18 9.1 17.3 13.6 14.4 15.8 C11.6 18 6.9 17.9 4.5 15.4 C3 13.8 3.3 12 4.7 11.1 C5.8 10.4 6 9.7 5.3 8.7 C4.2 7.2 5.1 5.4 7 4.3 Z" className={styles.beanBody} />
      </svg>
    </button>
  );
}

/** Now marker for the Timebox: a leaf on the vine line. */
export function LeafMarker() {
  return (
    <svg className={styles.leafMarker} viewBox="0 0 24 16" aria-hidden="true">
      <path d="M2 8 C6 1 16 0 22 8 C16 16 6 15 2 8 Z" />
      <path d="M4 8 L18 8" className={styles.leafVein} />
    </svg>
  );
}

/** Timer ring: a track with progress and a leaf that grows as time passes. */
export function LeafRing({ progress, label }: { progress: number; label?: string }) {
  const p = Math.max(0, Math.min(1, progress));
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg className={styles.ring} viewBox="0 0 36 36" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <circle cx="18" cy="18" r={r} className={styles.ringTrack} />
      <circle
        cx="18"
        cy="18"
        r={r}
        className={styles.ringProgress}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - p)}
        transform="rotate(-90 18 18)"
      />
      <g transform={`translate(18 18) scale(${0.35 + 0.65 * p}) translate(-18 -18)`}>
        <path d="M18 26 C18 22 18 18 18 14" className={styles.ringStem} />
        <path d="M18 16 C19 11 24 9 28 10 C27 15 22 18 18 16 Z" className={styles.ringLeaf} />
        <path d="M18 19 C16 15 12 14 8 15 C10 20 15 21 18 19 Z" className={styles.ringLeaf} />
      </g>
    </svg>
  );
}

export type MascotScene = "idle" | "spill" | "rest" | "water" | "packet" | "search" | "sleep" | "cheer";

/** The Beans mascot, drawn in code from the master SVG, with a small garden prop. */
export function Mascot({ scene = "idle", className }: { scene?: MascotScene; className?: string }) {
  const sleepy = scene === "sleep";
  return (
    <svg className={`${styles.mascot} ${className ?? ""}`} viewBox="40 0 520 512" aria-hidden="true">
      <path d="M60 470 C180 452 380 452 540 470" className={styles.soil} />
      <g className={scene === "cheer" ? styles.hop : undefined}>
        <path d="M278 132 C276 110 280 92 288 76" className={styles.mStem} />
        <path d="M286 82 C300 36 356 20 412 36 C408 92 344 118 286 82 Z" className={styles.mLeaf} />
        <path d="M286 82 C326 70 366 54 400 40 C408 92 344 118 286 82 Z" className={styles.mLeaf2} />
        <path d="M282 94 C256 56 210 46 164 64 C176 110 234 124 282 94 Z" className={styles.mLeaf} />
        <path d="M282 94 C244 88 208 78 174 72 C188 112 238 122 282 94 Z" className={styles.mLeaf2} />
        <path d={BEAN_PATH} className={styles.mBean} />
        <path
          d="M384 196 C392 214 402 234 402 256 C402 350 306 462 196 462 C150 462 112 434 98 394 C124 428 166 442 208 438 C304 428 388 322 384 196 Z"
          className={styles.mShade}
        />
        <path d="M212 192 C222 172 240 160 264 156" className={styles.mHighlight} />
        <g transform="rotate(-18 280 290)">
          {sleepy ? (
            <>
              <path d="M210 282 C220 292 238 292 246 282" className={styles.mLid} />
              <path d="M318 282 C328 292 346 292 354 282" className={styles.mLid} />
            </>
          ) : (
            <>
              <circle cx="228" cy="280" r="22" className={styles.mEye} />
              <circle cx="336" cy="280" r="22" className={styles.mEye} />
              <circle cx="236" cy="271" r="7.5" className={styles.mGlint} />
              <circle cx="344" cy="271" r="7.5" className={styles.mGlint} />
            </>
          )}
          <path d="M260 310 C268 330 296 330 304 310" className={styles.mMouth} />
          <ellipse cx="190" cy="318" rx="24" ry="14" className={styles.mCheek} />
          <ellipse cx="364" cy="318" rx="18" ry="13" className={styles.mCheek} />
        </g>
      </g>
      {scene === "spill" ? (
        <g className={styles.prop}>
          <ellipse cx="440" cy="452" rx="22" ry="14" transform="rotate(-20 440 452)" className={styles.mBean} />
          <ellipse cx="486" cy="458" rx="20" ry="13" transform="rotate(15 486 458)" className={styles.mShade} />
          <ellipse cx="462" cy="430" rx="18" ry="12" transform="rotate(-5 462 430)" className={styles.mBean} />
        </g>
      ) : null}
      {scene === "water" ? (
        <g className={styles.prop}>
          <path d="M420 300 L500 300 L492 380 L428 380 Z" className={styles.propBody} />
          <path d="M500 316 L548 284" className={styles.propLine} />
          <path d="M436 300 C436 270 484 270 484 300" className={styles.propLine} />
          <circle cx="552" cy="300" r="5" className={styles.drop} />
          <circle cx="546" cy="322" r="5" className={styles.drop} />
        </g>
      ) : null}
      {scene === "packet" ? (
        <g className={styles.prop} transform="rotate(8 470 380)">
          <rect x="420" y="300" width="100" height="140" rx="10" className={styles.propPaper} />
          <ellipse cx="470" cy="360" rx="24" ry="16" className={styles.mBean} />
          <path d="M440 410 L500 410" className={styles.propLine} />
        </g>
      ) : null}
      {scene === "search" ? (
        <g className={styles.prop}>
          <circle cx="470" cy="330" r="40" className={styles.propLens} />
          <path d="M498 360 L540 404" className={styles.propHandle} />
        </g>
      ) : null}
      {scene === "rest" ? (
        <g className={styles.prop}>
          <path d="M430 470 C430 420 450 390 470 380" className={styles.mStem} />
          <path d="M470 380 C480 350 510 344 530 352 C522 380 494 392 470 380 Z" className={styles.mLeaf} />
          <path d="M452 420 C436 396 412 392 394 400 C402 424 428 430 452 420 Z" className={styles.mLeaf2} />
        </g>
      ) : null}
      {sleepy ? (
        <g className={styles.prop}>
          <path d="M440 150 L476 150 L440 186 L476 186" className={styles.propLine} />
          <path d="M492 96 L516 96 L492 120 L516 120" className={styles.propLine} />
        </g>
      ) : null}
    </svg>
  );
}

/** Empty state: mascot, a short line of copy and an optional action. */
export function EmptyState({
  scene,
  title,
  children,
  compact,
}: {
  scene: MascotScene;
  title: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`${styles.empty} ${compact ? styles.emptyCompact : ""}`}>
      <Mascot scene={scene} className={styles.emptyMascot} />
      <p className={styles.emptyTitle}>{title}</p>
      {children ? <div className={styles.emptyBody}>{children}</div> : null}
    </div>
  );
}
