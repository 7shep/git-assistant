# git-assist

Ask natural language questions about any git repo, answered by a local AI — no API keys, no usage costs, fully offline.

```
❯ what changed in the last 5 commits?
  ▶ calling git_log { max: 5 }
  a3f9c12  add OAuth token refresh logic    2h ago
  d81cc04  fix session expiry edge case     5h ago
  f220ab1  scaffold auth middleware         1d ago

❯ who last modified src/auth.ts?
  ▶ calling git_blame { file: "src/auth.ts" }
  Last modified by Alex on 2025-05-20 (commit d81cc04)
```

---

## How it works

`git-assist` runs a local LLM via [Ollama](https://ollama.com) and gives it access to six git tools (`git log`, `git diff`, `git status`, `git branch`, `git show`, `git blame`). You ask a question in plain English, the model picks the right tool, runs it against your real repo, and streams back a formatted answer.

Everything runs on your machine. Nothing is sent to the cloud.

---

## Requirements

- **Node.js** v20 or later — [nodejs.org](https://nodejs.org)
- **Ollama** — [ollama.com/download](https://ollama.com/download)
- A machine with at least **8 GB RAM** (16 GB+ recommended for better models)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/7shep/git-assistant.git 
cd git-assist
npm install
npm run build
```

### 2. Install globally

```bash
npm install -g .
```

This puts `git-assist` on your PATH so you can run it from any directory.

### 3. Install Ollama

Download and run the installer from [ollama.com/download](https://ollama.com/download).

> **Note:** On first run, `git-assist` will automatically start Ollama and download the model if they aren't already set up.

---

## Usage

Navigate to any git repository and run:

```bash
cd ~/your-project
git-assist
```

That's it. The first launch downloads the AI model (~4.7 GB, one time only), then the UI starts.
NOTE: This downloads qwen3:8b, if you want to use a different model, you'll have to alter the code OR run git-assist --model <modelname> 

### Options

```
git-assist [--repo <path>] [--model <tag>]

  --repo  <path>   Query a different repo (default: current directory)
  --model <tag>    Use a different Ollama model (default: qwen3:8b)
```

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `GIT_ASSISTANT_MODEL` | `qwen3:8b` | Ollama model tag to use |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Ollama server address |

### Example questions

- `what changed in the last 10 commits?`
- `summarize the diff between main and this branch`
- `who last modified package.json and when?`
- `are there any uncommitted changes?`
- `show me the details of commit abc1234`
- `what files did the last commit touch?`

### Commands

| Input | Action |
|---|---|
| `exit` / `quit` / `q` | Close the assistant |
| `Ctrl+C` | Force quit |

---

## Choosing a model

The default model is `qwen3:8b` — a strong choice for tool calling at 7B parameters (~4.7 GB). If you want to trade speed for quality, or quality for speed:

| Model | Size | Notes |
|---|---|---|
| `qwen3:8b` | 5.2 GB | **Default.** Newer Qwen generation, strong tool calling. |
| `qwen3:8b` | 4.7 GB | Previous default. Slightly smaller. |
| `llama3.1:8b` | 4.9 GB | Meta's model. Solid alternative. |
| `qwen2.5:14b` | 9 GB | Smarter, but slower on GPUs under 12 GB VRAM. |

Switch models with the `--model` flag or the `GIT_ASSISTANT_MODEL` env var:

```bash
git-assist --model llama3.1:8b
```

---

## Updating

After pulling new changes:

```bash
npm run build
npm install -g .
```

---

## Tech stack

- **TypeScript** — language
- **Ink** — React-based terminal UI
- **Ollama JS** — local LLM client (tool calling + streaming)
- **Zod** — tool input validation
- **Node.js child_process** — git command execution (no shell, injection-safe)
