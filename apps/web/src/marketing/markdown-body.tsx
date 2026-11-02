import { Fragment } from "react";

/** Renders `**bold**` and `[links](href)` inside one line of copy. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) return <a key={i} href={link[2]}>{link[1]}</a>;
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

/**
 * The small markdown used in `legal.ts`: blocks split by blank lines, where a
 * block is a `## ` heading, a run of `- ` list items, or a paragraph.
 */
export function MarkdownBody({ source }: { source: string }) {
  return (
    <>
      {source.split(/\n\n+/).map((block, i) => {
        if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={i}>
              {lines.map((line, j) => (
                <li key={j}>
                  <Inline text={line.slice(2)} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            <Inline text={block} />
          </p>
        );
      })}
    </>
  );
}
