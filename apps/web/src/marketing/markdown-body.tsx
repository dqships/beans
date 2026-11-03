import { Fragment } from "react";

/** Renders `**bold**`, `` `code` `` and `[links](href)` inside one line of copy. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((part, i) => {
        const code = part.match(/^`([^`]+)`$/);
        if (code) return <code key={i}>{code[1]}</code>;
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
 * The small markdown used in `legal.ts` and `connect.ts`: blocks split by
 * blank lines, where a block is a `## ` heading, a run of `- ` or `1. ` list
 * items, a fenced code block, or a paragraph.
 */
export function MarkdownBody({ source }: { source: string }) {
  return (
    <>
      {source.split(/\n\n+/).map((block, i) => {
        if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
        if (block.startsWith("```")) {
          return (
            <pre key={i}>
              <code>{block.replace(/^```\w*\n?/, "").replace(/\n?```$/, "")}</code>
            </pre>
          );
        }
        const lines = block.split("\n");
        if (lines.every((line) => /^\d+\. /.test(line))) {
          return (
            <ol key={i}>
              {lines.map((line, j) => (
                <li key={j}>
                  <Inline text={line.replace(/^\d+\. /, "")} />
                </li>
              ))}
            </ol>
          );
        }
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
