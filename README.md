Ask natural language questions about any git repo, answered by a local AI — no API keys, no usage costs, fully offline.

Works two ways: as a **standalone terminal app** you launch yourself, or as an **MCP server** wired into AI coding agents like Claude Code.

---

## How it works

`git-assist` gives an AI access to six git tools (`git log`, `git diff`, `git status`, `git branch`, `git show`, `git blame`). You ask a question in plain English, the model picks the right tool, runs it against your real repo, and streams back a formatted answer.

Everything runs on your machine. Nothing is sent to the cloud.

---

## Requirements

- **Node.js** v20 or later — [nodejs.org](https://nodejs.org)
- **Ollama** — [ollama.com/download](https://ollama.com/download)
- At least **8 GB RAM** (16 GB+ recommended)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/7shep/git-assistant.git
cd git-assistant
npm install
npm run build
```

### 2. Install Ollama

Download and run the installer from [ollama.com/download](https://ollama.com/download).

> On first run, `git-assist` will automatically start Ollama and download the model if they aren't already set up.

---

## Option A — Standalone terminal app

Install globally so you can run it from any directory:

```bash
npm install -g .
```

Then navigate to any git repo and launch:

```bash
cd ~/your-project
git-assist
```

The first launch downloads the AI model (~5 GB, one time only), then the interactive UI starts.

```
❯ what changed in the last 5 commits?
  ▶ calling git_log { max: 5 }
  a3f9c12  add OAuth token refresh logic    2h ago
  d81cc04  fix session expiry edge case     5h ago

❯ who last modified src/auth.ts?
  ▶ calling git_blame { file: "src/auth.ts" }
  Last modified by Alex on 2025-05-20 — commit d81cc04
```

### Options

```
git-assist [--repo <path>] [--model <tag>]

  --repo  <path>   git repository to query (default: current directory)
  --model <tag>    Ollama model tag (default: qwen3:8b)
```

### Commands

| Input | Action |
|---|---|
| `exit` / `quit` / `q` | Close the assistant |
| `Ctrl+C` | Force quit |

---

## Option B — MCP server for AI coding agents

This wires `git-assist` into Claude Code (or any MCP-compatible agent) as a set of callable tools. The agent can then query your repo directly — no separate terminal needed.

### Register with Claude Code

Run this once from the project directory:

```bash
claude mcp add --transport stdio git-assistant -- node /absolute/path/to/git-assistant/dist/mcp.js
```

Replace `/absolute/path/to/git-assistant` with where you cloned the repo. On Windows use forward slashes:

```bash
claude mcp add --transport stdio git-assistant -- node C:/Users/yourname/git-assistant/dist/mcp.js
```

### Using it

Once registered, open any Claude Code session and ask naturally:

- *"What changed in the last 5 commits?"*
- *"Summarize the diff between main and this branch"*
- *"Who last modified package.json?"*

Claude Code will call the appropriate git tool automatically.

Each tool accepts an optional `repo` parameter so you can point it at any repo path, not just the one you opened:

- *"What's the status of the repo at ~/other-project?"*

### Other MCP-compatible agents

Any agent that supports the MCP stdio transport works the same way. Register `node /path/to/dist/mcp.js` as a stdio server and the six tools become available.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `GIT_ASSISTANT_MODEL` | `qwen3:8b` | Ollama model (standalone mode only) |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama server address |
| `OLLAMA_MODELS` | OS default | Where Ollama stores downloaded models |

---

## Choosing a model

| Model | Size | Notes |
|---|---|---|
| `qwen3:8b` | 5.2 GB | **Default.** Strong tool calling, good reasoning. |
| `qwen2.5:7b` | 4.7 GB | Slightly smaller, still solid. |
| `llama3.1:8b` | 4.9 GB | Meta's model. Good alternative. |
| `qwen2.5:14b` | 9 GB | Smarter, but slower on GPUs under 12 GB VRAM. |

Switch models with the `--model` flag or the env var:

```bash
git-assist --model llama3.1:8b
# or
export GIT_ASSISTANT_MODEL=llama3.1:8b
```

---

## Updating

After pulling new changes:

```bash
npm install
npm run build
npm install -g .   # if using the standalone CLI
```

---

## Tech stack

- **TypeScript** — language
- **Ink** — React-based terminal UI (standalone mode)
- **Ollama JS** — local LLM client with tool calling and streaming
- **MCP SDK** — Model Context Protocol server (agent mode)
- **Zod** — tool input validation
- **Node.js child_process** — git command execution (no shell, injection-safe)
