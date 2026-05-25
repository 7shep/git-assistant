#!/usr/bin/env node
import { render } from "ink";
import chalk from "chalk";
import { resolveRepo, repoName, currentBranch } from "./lib/git.js";
import {
  checkOllama,
  ensureOllama,
  ensureModel,
  DEFAULT_MODEL,
  DEFAULT_HOST,
} from "./lib/llm.js";
import { App } from "./app.js";

// ── Parse CLI arguments ────────────────────────────────────────────────────

function parseArgs(argv: string[]): { repo?: string; model?: string } {
  const args = argv.slice(2);
  let repo: string | undefined;
  let model: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repo" && args[i + 1]) {
      repo = args[++i];
    } else if (args[i] === "--model" && args[i + 1]) {
      model = args[++i];
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(
        [
          "",
          chalk.green("git-assist") + " — ask natural language questions about any git repo",
          "",
          "Usage:  git-assist [--repo <path>] [--model <tag>]",
          "",
          "  --repo  <path>   git repository to query (default: current directory)",
          "  --model <tag>    Ollama model tag (default: " + DEFAULT_MODEL + ")",
          "                   override with env var GIT_ASSISTANT_MODEL",
          "",
          "Ollama is started automatically if it isn't already running.",
          "The model is downloaded on first use.",
          "",
        ].join("\n")
      );
      process.exit(0);
    }
  }

  return { repo, model };
}

// ── Startup ────────────────────────────────────────────────────────────────

const { repo: repoArg, model: modelArg } = parseArgs(process.argv);
const cwd = repoArg ?? process.cwd();
const model = modelArg ?? process.env["GIT_ASSISTANT_MODEL"] ?? DEFAULT_MODEL;
const ollamaHost = process.env["OLLAMA_HOST"] ?? DEFAULT_HOST;

// 1. Validate git repo
try {
  await resolveRepo(cwd);
} catch {
  console.error(
    chalk.red("✗ Not a git repository:") + " " + cwd +
    "\n  Run from inside a git repo, or pass --repo <path>"
  );
  process.exit(1);
}

// 2. Ensure Ollama is running (starts it automatically if needed)
const ollamaCmd = await ensureOllama(ollamaHost);
if (!ollamaCmd) {
  console.error(
    chalk.red("✗ Could not start Ollama.") + "\n\n" +
    "  Install it from: " + chalk.cyan("https://ollama.com/download") + "\n" +
    "  Then run: " + chalk.cyan("git-assist") + " again.\n"
  );
  process.exit(1);
}

// 3. Ensure the model is pulled (downloads on first use)
const { models: pulledModels } = await checkOllama(ollamaHost);
try {
  await ensureModel(ollamaCmd, model, pulledModels);
} catch (e) {
  console.error(
    chalk.red("✗ Failed to pull model: ") + model + "\n" +
    "  " + (e instanceof Error ? e.message : String(e))
  );
  process.exit(1);
}

// 4. Gather repo metadata and launch
const [rn, br] = await Promise.all([repoName(cwd), currentBranch(cwd)]);
render(<App cwd={cwd} repoName={rn} branch={br} model={model} />);
