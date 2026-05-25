import { z } from "zod";
import { runGit } from "../lib/git.js";

export const name = "git_branches";

export const description =
  "List local branches with their latest commit and upstream tracking info. Optionally include remote branches.";

export const inputSchema = z.object({
  remote: z
    .boolean()
    .default(false)
    .describe("If true, include remote-tracking branches."),
});

export async function run(rawInput: unknown, cwd: string): Promise<string> {
  const input = inputSchema.parse(rawInput);
  const args = input.remote ? ["branch", "-a", "-vv"] : ["branch", "-vv"];
  const { stdout } = await runGit(args, cwd);
  return stdout.trim() || "(no branches found)";
}
