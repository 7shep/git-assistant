import { z } from "zod";
import { runGit, validateRef } from "../lib/git.js";

export const name = "git_log";

export const description =
  "Show recent commit history. Filter by number of commits, file path, author, date, or branch.";

export const inputSchema = z.object({
  max: z
    .number()
    .int()
    .positive()
    .max(500)
    .default(20)
    .describe("Maximum number of commits to return (default 20)."),
  path: z
    .string()
    .optional()
    .describe("Limit history to commits touching this file or directory."),
  author: z
    .string()
    .optional()
    .describe("Filter by author name or email (substring match)."),
  since: z
    .string()
    .optional()
    .describe('Show commits newer than this date, e.g. "2 weeks ago" or "2024-01-01".'),
  branch: z
    .string()
    .optional()
    .describe("Branch or ref to start history from. Defaults to HEAD."),
});

export async function run(rawInput: unknown, cwd: string): Promise<string> {
  const input = inputSchema.parse(rawInput);

  const args: string[] = [
    "log",
    "--pretty=format:%h  %as  %an%n    %s",
    "-n",
    String(input.max ?? 20),
  ];

  if (input.author) {
    validateRef(input.author, "author");
    args.push(`--author=${input.author}`);
  }
  if (input.since) {
    validateRef(input.since, "since");
    args.push(`--since=${input.since}`);
  }
  if (input.branch) {
    validateRef(input.branch, "branch");
    args.push(input.branch);
  }
  if (input.path) {
    validateRef(input.path, "path");
    args.push("--", input.path);
  }

  const { stdout } = await runGit(args, cwd);
  return stdout.trim() || "(no commits found)";
}
