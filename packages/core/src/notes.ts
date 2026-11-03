/**
 * Task notes are HTML from the rich-text editor. Connected AI apps read and
 * write plain text, so these convert between the two.
 */

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text to editor HTML: one paragraph per line, and lines starting with "- " as a bullet list. */
export function textToNotes(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) out.push(`<ul>${bullets.map((b) => `<li><p>${escape(b)}</p></li>`).join("")}</ul>`);
    bullets = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1]!);
      continue;
    }
    flush();
    if (line.trim()) out.push(`<p>${escape(line)}</p>`);
  }
  flush();
  return out.join("");
}

/** Editor HTML to plain text, keeping paragraphs and bullets as lines. */
export function notesToText(html: string): string {
  return html
    .replace(/<\/p>\s*<\/li>/gi, "</li>")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|h[1-6]|blockquote|pre|div)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
