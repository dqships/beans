import path from "node:path";
import { Config } from "@remotion/cli/config";
import { webpack } from "@remotion/bundler";

const root = process.cwd();
const shim = (name: string) => path.join(root, "src/shims", name);

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
// The web app's public folder, so the film reads the same illustrations the site ships.
Config.setPublicDir(path.join(root, "../web/public"));

Config.overrideWebpackConfig((config) => ({
  ...config,
  module: {
    ...config.module,
    rules: config.module?.rules?.map((rule) => {
      if (!rule || typeof rule !== "object") return rule;
      // Figtree travels inside the bundle, so a render never depends on a font server.
      if (String(rule.test).includes("woff")) return { ...rule, type: "asset/inline" };
      if (String(rule.test).includes("css") && Array.isArray(rule.use)) {
        // The app reads classes like `w-capture` by their exact names, as Next.js exports them.
        const use = rule.use.map((loader) =>
          loader && typeof loader === "object" && String(loader.loader).includes("css-loader")
            ? { ...loader, options: { modules: { auto: true, namedExport: false, exportLocalsConvention: "asIs" } } }
            : loader,
        );
        return { ...rule, use };
      }
      return rule;
    }),
  },
  resolve: {
    ...config.resolve,
    alias: { ...config.resolve?.alias, "@": path.join(root, "../web/src") },
  },
  plugins: [
    ...(config.plugins ?? []),
    // These four modules read the wall clock, the browser or React state. Swapping
    // them is what lets the real planner components draw from the frame number.
    new webpack.NormalModuleReplacementPlugin(/^@\/data\/hooks$/, shim("hooks.ts")),
    new webpack.NormalModuleReplacementPlugin(/^\.\/ui-state$/, shim("ui-state.tsx")),
    new webpack.NormalModuleReplacementPlugin(/^\.\/dnd$/, shim("dnd.tsx")),
    new webpack.NormalModuleReplacementPlugin(/^@\/ui\/Modal$/, shim("Modal.tsx")),
  ],
}));
