/** Sets the theme before first paint, from the last saved choice. */
export const THEME_STORAGE_KEY = "beans-theme";

const script = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
