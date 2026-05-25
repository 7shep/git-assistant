import { z } from "zod";
import { runGit, validateRef } from "../lib/git.js";

export const name = "git_blame";

export const description =
  "Show who last modified each line of a file and in which commit. Optionally limit to a line range.";

export const inputSchema = z.object({
  file: z
    .string()
    .describe("Path to the file to blame, relative to the repository root."),
  start: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("First line number of the range (1-based)."),
  end: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Last line number of the range (1-based, inclusive)."),
  rev: z
    .string()
    .optional()
    .describe("Blame at a specific revision instead of HEAD."),
});

export async function run(rawInput: unknown, cwd: string): Promise<string> {
  const input = inputSchema.parse(rawInput);
  validateRef(input.file, "file");
  if (input.rev) validateRef(input.rev, "rev");

  const args = ["blame", "--date=short"];

  if (input.start !== undefined && input.end !== undefined) {
    args.push("-L", `${input.start},${input.end}`);
  } else if (input.start !== undefined) {
    args.push("-L", `${input.start},+50`);
  }

  if (input.rev) args.push(input.rev);
  args.push("--", input.file);

  const { stdout } = await runGit(args, cwd);
  return stdout.trim() || "(no output)";
}
