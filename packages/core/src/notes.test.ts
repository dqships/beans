import { describe, expect, it } from "vitest";
import { notesToText, textToNotes } from "./notes";

describe("notes", () => {
  it("turns lines into paragraphs and dashes into a bullet list", () => {
    expect(textToNotes("Pack the night before\n\n- Shoes\n- Gels\nStart slow")).toBe(
      "<p>Pack the night before</p><ul><li><p>Shoes</p></li><li><p>Gels</p></li></ul><p>Start slow</p>",
    );
  });

  it("escapes markup so text can't become HTML", () => {
    expect(textToNotes('<img src=x onerror="1"> & more')).toBe('<p>&lt;img src=x onerror="1"&gt; &amp; more</p>');
  });

  it("reads editor HTML back as text", () => {
    expect(notesToText("<p>Check the timeline &amp; budget.</p><ul><li><p>One</p></li><li><p>Two</p></li></ul>")).toBe(
      "Check the timeline & budget.\n- One\n- Two",
    );
    expect(notesToText("")).toBe("");
  });

  it("round-trips plain text", () => {
    const text = "Warm up\n- 10 min jog\n- Strides";
    expect(notesToText(textToNotes(text))).toBe(text);
  });
});
