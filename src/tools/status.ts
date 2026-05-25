import { z } from "zod";
import { runGit, validateRef } from "../lib/git.js";

export const name = "git_status";

export const description =
  "Show the working tree status of the current repo: staged, unstaged, and untracked files, plus branch info.";

export const inputSchema = z.object({}).describe("No parameters required.");

export async function run(_rawInput: unknown, cwd: string): Promise<string> {
  validateRef; // imported but used by other tools; silence unused warning
  const { stdout } = await runGit(["status", "--short", "--branch"], cwd);
  return stdout.trim() || "(working tree is clean)";
}
