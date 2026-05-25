import { z } from "zod";
import { runGit, validateRef } from "../lib/git.js";

export const name = "git_diff";

export const description =
  "Show a diff between two commits/branches or between the working tree and a ref. Limit to a file or directory with 'path'.";

export const inputSchema = z.object({
  base: z
    .string()
    .optional()
    .describe("Base ref (branch, tag, or commit SHA) to diff from. Omit to diff working tree vs HEAD."),
  head: z
    .string()
    .optional()
    .describe("Head ref. Requires base to also be set."),
  path: z
    .string()
    .optional()
    .describe("Limit diff to this file or directory."),
  staged: z
    .boolean()
    .default(false)
    .describe("Show staged (index) changes instead of working tree changes."),
  stat_only: z
    .boolean()
    .default(false)
    .describe("Return only the --stat summary, not the full patch."),
});

export async function run(rawInput: unknown, cwd: string): Promise<string> {
  const input = inputSchema.parse(rawInput);

  const args: string[] = ["diff"];
  if (input.stat_only) args.push("--stat");
  if (input.staged) args.push("--cached");

  if (input.base) {
    validateRef(input.base, "base");
    if (input.head) {
      validateRef(input.head, "head");
      args.push(`${input.base}..${input.head}`);
    } else {
      args.push(input.base);
    }
  }

  if (input.path) {
    validateRef(input.path, "path");
    args.push("--", input.path);
  }

  const { stdout } = await runGit(args, cwd);
  return stdout.trim() || "(no differences)";
}
