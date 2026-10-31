#!/usr/bin/env node
// Vercel "Ignored Build Step" for the web app (Root Directory: apps/web).
// Exit 0 skips the build; exit 1 builds. When unsure, build.
import { execFileSync } from "node:child_process";

/** Paths, relative to apps/web, whose changes need a new build. */
export const WATCHED = [
  ".",
  "../../packages",
  "../../convex",
  "../../pnpm-lock.yaml",
  "../../pnpm-workspace.yaml",
  "../../package.json",
];

/** Branches that never get Vercel previews; verify them locally instead. */
export const SKIPPED_PREFIXES = ["claude/", "codex/"];

export function decide(env = process.env, run = git) {
  const branch = env.VERCEL_GIT_COMMIT_REF ?? "";
  if (SKIPPED_PREFIXES.some((p) => branch.startsWith(p))) {
    return { build: false, reason: `Skipping: ${branch} is an agent branch.` };
  }
  const current = env.VERCEL_GIT_COMMIT_SHA || "HEAD";
  const previous = env.VERCEL_GIT_PREVIOUS_SHA;
  if (!previous) return { build: true, reason: "Building: no previous deployment to compare with." };
  try {
    run(["cat-file", "-e", `${previous}^{commit}`]);
  } catch {
    return { build: true, reason: `Building: ${previous.slice(0, 7)} isn't in this clone.` };
  }
  try {
    run(["diff", "--quiet", previous, current, "--", ...WATCHED]);
    return { build: false, reason: "Skipping: nothing the web app uses changed." };
  } catch {
    return { build: true, reason: "Building: the web app or something it uses changed." };
  }
}

function git(args) {
  return execFileSync("git", args, { stdio: "ignore" });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { build, reason } = decide();
  console.log(reason);
  process.exit(build ? 1 : 0);
}
