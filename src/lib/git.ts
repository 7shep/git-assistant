import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { basename } from "node:path";

const execFileAsync = promisify(execFile);

const MAX_OUTPUT_BYTES = 200_000; // 200 KB cap
const TIMEOUT_MS = 15_000;       // 15 s timeout

export interface GitResult {
  stdout: string;
  stderr: string;
  code: number;
}

/** Run a git command and capture output. Throws a user-facing Error on failure. */
export async function runGit(args: string[], cwd: string): Promise<GitResult> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd,
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      windowsHide: true,
    });
    return { stdout, stderr, code: 0 };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
      code?: number | string;
      killed?: boolean;
    };
    const stderr = e.stderr ?? "";
    const stdout = e.stdout ?? "";
    const code = typeof e.code === "number" ? e.code : 1;
    if (e.killed) {
      throw new Error(
        `git command timed out after ${TIMEOUT_MS / 1000}s: git ${args.join(" ")}`
      );
    }
    const result: GitResult = { stdout, stderr, code };
    throw Object.assign(
      new Error(stderr.trim() || `git exited with code ${code}`),
      { result }
    );
  }
}

/**
 * Validate that `cwd` exists and is inside a git work tree.
 * Throws a descriptive Error if not.
 */
export async function resolveRepo(cwd: string): Promise<string> {
  if (!existsSync(cwd)) {
    throw new Error(`Path does not exist: ${cwd}`);
  }
  try {
    await runGit(["rev-parse", "--is-inside-work-tree"], cwd);
  } catch {
    throw new Error(`Not a git repository (or any parent up to mount point): ${cwd}`);
  }
  return cwd;
}

/** Return the repository's top-level folder name (e.g. "my-project"). */
export async function repoName(cwd: string): Promise<string> {
  try {
    const { stdout } = await runGit(["rev-parse", "--show-toplevel"], cwd);
    return basename(stdout.trim());
  } catch {
    return basename(cwd);
  }
}

/** Return the current branch name, or a short detached-HEAD description. */
export async function currentBranch(cwd: string): Promise<string> {
  try {
    const { stdout } = await runGit(
      ["rev-parse", "--abbrev-ref", "HEAD"],
      cwd
    );
    const branch = stdout.trim();
    if (branch === "HEAD") {
      // Detached HEAD — show short SHA instead
      const { stdout: sha } = await runGit(["rev-parse", "--short", "HEAD"], cwd);
      return `(${sha.trim()})`;
    }
    return branch;
  } catch {
    return "unknown";
  }
}

/** Guard against option-injection: refs/values must not start with "-". */
export function validateRef(ref: string, label: string): void {
  if (ref.startsWith("-")) {
    throw new Error(`Invalid ${label}: must not start with "-"`);
  }
}
