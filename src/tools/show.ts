import { z } from "zod";
import { runGit, validateRef } from "../lib/git.js";

export const name = "git_show";

export const description =
  "Inspect a specific commit: its message, author, date, changed files, and optionally the full patch.";

export const inputSchema = z.object({
  ref: z
    .string()
    .describe("Commit SHA, tag, or branch name to inspect (e.g. HEAD, main, abc1234)."),
  stat_only: z
    .boolean()
    .default(false)
    .describe("If true, show only the commit message and file summary without the full patch."),
});

export async function run(rawInput: unknown, cwd: string): Promise<string> {
  const input = inputSchema.parse(rawInput);
  validateRef(input.ref, "ref");

  const args = ["show", input.ref, "--stat"];
  if (!input.stat_only) args.push("-p");
  else args.push("--no-patch");

  const { stdout } = await runGit(args, cwd);
  return stdout.trim() || "(empty output)";
}
