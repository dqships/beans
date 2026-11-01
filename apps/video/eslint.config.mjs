import js from "@eslint/js";
import hooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "out/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      // Rendered frames depend on the frame number only.
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Frames must not read the clock. Use clockAt(frame)." },
        { object: "Math", property: "random", message: "Use random(seed) from remotion." },
      ],
    },
  },
);
