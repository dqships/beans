"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  LinkSimple,
  ListBullets,
  ListNumbers,
  TextB,
  TextItalic,
  TextStrikethrough,
  TextUnderline,
} from "@phosphor-icons/react";
import { Icon } from "@/ui/Icon";
import styles from "./notes.module.css";

/** Rich-text notes. Select text for the formatting toolbar; Markdown shortcuts work too. */
export function NotesEditor({ value, onChange, label = "Notes" }: { value: string; onChange: (html: string) => void; label?: string }) {
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, link: { openOnClick: false, autolink: true } }),
      Placeholder.configure({ placeholder: "Add notes, links or a checklist of thoughts" }),
    ],
    content: value || "",
    editorProps: { attributes: { class: styles.prose ?? "", "aria-label": label, role: "textbox", "aria-multiline": "true" } },
    onUpdate: ({ editor }) => {
      if (timer.current) clearTimeout(timer.current);
      const html = editor.isEmpty ? "" : editor.getHTML();
      timer.current = setTimeout(() => changeRef.current(html), 400);
    },
    onBlur: ({ editor }) => {
      if (timer.current) clearTimeout(timer.current);
      changeRef.current(editor.isEmpty ? "" : editor.getHTML());
    },
  });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            link: e.isActive("link"),
          }
        : null,
  });
  if (!editor) return <div className={styles.prose} />;
  const tools = [
    { key: "bold", icon: TextB, label: "Bold", run: () => editor.chain().focus().toggleBold().run() },
    { key: "italic", icon: TextItalic, label: "Italic", run: () => editor.chain().focus().toggleItalic().run() },
    { key: "underline", icon: TextUnderline, label: "Underline", run: () => editor.chain().focus().toggleUnderline().run() },
    { key: "strike", icon: TextStrikethrough, label: "Strikethrough", run: () => editor.chain().focus().toggleStrike().run() },
    { key: "bullet", icon: ListBullets, label: "Bulleted list", run: () => editor.chain().focus().toggleBulletList().run() },
    { key: "ordered", icon: ListNumbers, label: "Numbered list", run: () => editor.chain().focus().toggleOrderedList().run() },
    {
      key: "link",
      icon: LinkSimple,
      label: "Link",
      run: () => {
        if (editor.isActive("link")) {
          editor.chain().focus().unsetLink().run();
          return;
        }
        const url = window.prompt("Link address");
        if (url) editor.chain().focus().extendMarkRange("link").setLink({ href: /^https?:\/\//.test(url) ? url : `https://${url}` }).run();
      },
    },
  ] as const;
  return (
    <div className={styles.wrap}>
      <BubbleMenu editor={editor} className={styles.toolbar} options={{ placement: "top" }}>
        {tools.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.tool} ${active?.[t.key] ? styles.toolOn : ""}`}
            aria-label={t.label}
            aria-pressed={active?.[t.key] ?? false}
            title={t.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={t.run}
          >
            <Icon icon={t.icon} />
          </button>
        ))}
      </BubbleMenu>
      <EditorContent editor={editor} />
    </div>
  );
}
