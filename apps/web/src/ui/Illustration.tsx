/** Every mascot pose in `public/illustrations`. Sizes are 1x CSS pixels, from docs/launch/assets.md. */
export const illustrations = {
  hero: { width: 800, height: 600, alt: "The Beans mascot beside a row of soil with one bean going into the ground and three seedlings growing." },
  "brain-dump": { width: 640, height: 480, alt: "The Beans mascot watching a pile of beans spill out of a tipped seed packet." },
  planning: { width: 640, height: 480, alt: "The Beans mascot beside three garden rows of beans, with one bean hopping into a gap." },
  timebox: { width: 640, height: 480, alt: "The Beans mascot sitting on a leaf halfway up a tall beanstalk." },
  focus: { width: 640, height: 480, alt: "The Beans mascot sitting still under a large leaf, next to a green timer ring." },
  rollover: { width: 640, height: 480, alt: "The Beans mascot asleep under a crescent moon while two beans roll toward the next row." },
  analytics: { width: 640, height: 480, alt: "The Beans mascot beside a full harvest basket and three green stalks of different heights." },
  phone: { width: 480, height: 480, alt: "The Beans mascot peeking over the top of a phone-sized seed packet." },
  "404": { width: 640, height: 480, alt: "The Beans mascot beside an empty hole in the soil, with a trowel stuck in a mound of dirt." },
  welcome: { width: 480, height: 480, alt: "The Beans mascot beside a watering can that is watering a seedling." },
  error: { width: 480, height: 480, alt: "The Beans mascot beside a tipped-over flower pot with spilled soil and a seedling." },
  "empty-trash": { width: 480, height: 480, alt: "The Beans mascot beside an empty bucket." },
  "email-header": { width: 600, height: 200, alt: "The Beans mascot at the end of a row that grows from a bean to a tall seedling." },
  "video-intro": { width: 960, height: 540, alt: "The Beans mascot in a row of seedlings with the sun coming up behind them." },
  "video-outro": { width: 960, height: 540, alt: "The Beans mascot beside a tipped seed packet with beans spilled on the soil." },
} as const;

export type IllustrationName = keyof typeof illustrations;

/**
 * A mascot pose: AVIF, then WebP, on a transparent background, so it works on both themes.
 * `alt` defaults to the pose's description. Pass `alt=""` when the words beside it say the same thing.
 * `compact` is for art shown at a third of its size or less, where the 1x file covers every screen.
 */
export function Illustration({
  name,
  alt,
  className,
  compact,
  eager,
}: {
  name: IllustrationName;
  alt?: string;
  className?: string;
  compact?: boolean;
  eager?: boolean;
}) {
  const pose = illustrations[name];
  const base = `/illustrations/${name}`;
  const files = (format: "avif" | "webp") => (compact ? `${base}@1x.${format}` : `${base}@1x.${format} 1x, ${base}@2x.${format} 2x`);
  return (
    <picture>
      <source type="image/avif" srcSet={files("avif")} />
      <source type="image/webp" srcSet={files("webp")} />
      <img
        className={className}
        src={`${base}@1x.webp`}
        width={pose.width}
        height={pose.height}
        alt={alt ?? pose.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}
