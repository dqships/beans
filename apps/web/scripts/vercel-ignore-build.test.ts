import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const script = join(__dirname, "vercel-ignore-build.mjs");
let repo = "";
const sha: Record<string, string> = {};

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}

function commit(name: string, file: string, content = name) {
  mkdirSync(join(repo, file, ".."), { recursive: true });
  writeFileSync(join(repo, file), content);
  git("add", "-A");
  git("commit", "-qm", name);
  sha[name] = git("rev-parse", "HEAD");
}

/** Runs the real script the way Vercel does, from apps/web. Returns the exit code. */
function run(env: Record<string, string>): number {
  try {
    execFileSync("node", [script], { cwd: join(repo, "apps/web"), env: { ...process.env, ...env }, stdio: "pipe" });
    return 0;
  } catch (e) {
    return (e as { status: number }).status;
  }
}

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), "beans-ignore-"));
  git("init", "-q");
  git("config", "user.email", "test@example.test");
  git("config", "user.name", "Test");
  commit("base", "apps/web/page.tsx");
  commit("docs", "TASKS.md");
  commit("web", "apps/web/page.tsx", "changed");
  commit("core", "packages/core/x.ts");
  commit("convex", "convex/planner.ts");
  commit("lock", "pnpm-lock.yaml");
  commit("readme", "README.md");
});

describe("Vercel build-skip script", () => {
  it("skips when only docs changed", () => {
    expect(run({ VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_PREVIOUS_SHA: sha.base!, VERCEL_GIT_COMMIT_SHA: sha.docs! })).toBe(0);
    expect(run({ VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_PREVIOUS_SHA: sha.lock!, VERCEL_GIT_COMMIT_SHA: sha.readme! })).toBe(0);
  });

  it.each(["web", "core", "convex", "lock"])("builds when %s changed", (name) => {
    const names = ["base", "docs", "web", "core", "convex", "lock"];
    const prev = names[names.indexOf(name) - 1]!;
    expect(run({ VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_PREVIOUS_SHA: sha[prev]!, VERCEL_GIT_COMMIT_SHA: sha[name]! })).toBe(1);
  });

  it("always skips agent branches", () => {
    expect(run({ VERCEL_GIT_COMMIT_REF: "claude/phase-5-launch", VERCEL_GIT_PREVIOUS_SHA: sha.base!, VERCEL_GIT_COMMIT_SHA: sha.web! })).toBe(0);
    expect(run({ VERCEL_GIT_COMMIT_REF: "codex/fix", VERCEL_GIT_PREVIOUS_SHA: sha.base!, VERCEL_GIT_COMMIT_SHA: sha.web! })).toBe(0);
  });

  it("builds when there's nothing to compare with", () => {
    expect(run({ VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_COMMIT_SHA: sha.docs! })).toBe(1);
    expect(run({ VERCEL_GIT_COMMIT_REF: "main", VERCEL_GIT_PREVIOUS_SHA: "0123456789abcdef0123456789abcdef01234567", VERCEL_GIT_COMMIT_SHA: sha.docs! })).toBe(1);
  });
});
