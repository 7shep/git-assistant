import { Ollama, type Message } from "ollama";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tools as toolRegistry, byName } from "../tools/index.js";

export const DEFAULT_MODEL = "qwen3:8b";
export const DEFAULT_HOST = "http://127.0.0.1:11434";

export interface LLMCallbacks {
  /** Called each time the model emits a text delta (streaming). */
  onToken: (delta: string) => void;
  /** Called when a tool is about to be executed. */
  onToolCall: (toolName: string, args: Record<string, unknown>) => void;
  /** Called when the full response (including any tool rounds) is complete. */
  onDone: () => void;
  /** Called if a fatal error occurs during the loop. */
  onError: (err: Error) => void;
}

/** Build Ollama tool definitions from the registry. */
const ollamaTools = toolRegistry.map((t) => ({
  type: "function" as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  },
}));

/**
 * Run one conversational turn against a local Ollama model.
 *
 * @param history   Prior conversation as user/assistant message pairs.
 * @param question  The new user question (appended to history before the call).
 * @param cwd       Absolute path to the git repo (passed to each tool's run()).
 * @param model     Ollama model tag, e.g. "qwen2.5:7b".
 * @param callbacks UI callbacks for streaming and status updates.
 */
export async function chat(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  question: string,
  cwd: string,
  model: string,
  callbacks: LLMCallbacks
): Promise<void> {
  const ollama = new Ollama({ host: process.env["OLLAMA_HOST"] ?? DEFAULT_HOST });

  const systemMessage: Message = {
    role: "system",
    content:
      `You are a git assistant. The repository is at: ${cwd}.\n` +
      `Use the provided tools to answer questions. Prefer calling a tool over guessing from memory.\n` +
      `Format your answers concisely and clearly for a terminal. Use plain text, not markdown.`,
  };

  // Build the full message list for this turn
  const messages: Message[] = [
    systemMessage,
    ...history,
    { role: "user", content: question },
  ];

  const MAX_ITERATIONS = 8; // cap tool-call loops to prevent runaway

  try {
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      // Stream each round so the final text response arrives token by token.
      // Tool-call rounds typically produce no content (just tool_calls), so
      // streaming them is fine — onToken will never be called spuriously.
      const stream = await ollama.chat({
        model,
        messages,
        tools: ollamaTools,
        stream: true,
      });

      let roundContent = "";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roundToolCalls: any[] = [];

      for await (const chunk of stream) {
        const msg = chunk.message;

        // Accumulate streamed text and push deltas to UI
        if (msg.content) {
          roundContent += msg.content;
          // Only forward text tokens if this round isn't a tool-call round.
          // We detect tool calls at the end; for now buffer and we'll decide.
          // (We emit after the loop if no tool calls were found.)
        }

        // Collect tool calls — they arrive in the final streaming chunk
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          roundToolCalls.push(...msg.tool_calls);
        }
      }

      if (roundToolCalls.length > 0) {
        // This round was a tool-calling round — execute each tool and loop.
        // Append the assistant's tool-call message first.
        const assistantMsg: Message = {
          role: "assistant",
          content: roundContent,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tool_calls: roundToolCalls as any,
        };
        messages.push(assistantMsg);

        for (const tc of roundToolCalls) {
          const fnName: string = tc.function?.name ?? "";
          const rawArgs: unknown = tc.function?.arguments ?? {};
          const args: Record<string, unknown> =
            typeof rawArgs === "string"
              ? (JSON.parse(rawArgs) as Record<string, unknown>)
              : (rawArgs as Record<string, unknown>);

          callbacks.onToolCall(fnName, args);

          let result: string;
          const tool = byName[fnName];
          if (!tool) {
            result = `Error: unknown tool "${fnName}"`;
          } else {
            try {
              result = await tool.run(args, cwd);
            } catch (e) {
              result = `Error running ${fnName}: ${e instanceof Error ? e.message : String(e)}`;
            }
          }

          // Append tool result message
          messages.push({ role: "tool", content: result });
        }

        // Continue the loop — next iteration will get the final answer
        continue;
      }

      // No tool calls: this is the final text response.
      // Emit the buffered content as tokens (we have it all now).
      if (roundContent) {
        callbacks.onToken(roundContent);
      } else {
        callbacks.onToken("(no response)");
      }
      callbacks.onDone();
      return;
    }

    // Reached max iterations without a final text response
    callbacks.onToken("(reached maximum tool iterations without a final answer)");
    callbacks.onDone();
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

/** Check if Ollama is reachable and return the list of pulled model tags. */
export async function checkOllama(
  host = DEFAULT_HOST
): Promise<{ ok: boolean; models: string[] }> {
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, models: [] };
    const json = (await res.json()) as { models?: Array<{ name: string }> };
    const models = (json.models ?? []).map((m) => m.name);
    return { ok: true, models };
  } catch {
    return { ok: false, models: [] };
  }
}

/** Find the ollama executable on common Windows install paths. */
export function findOllamaExe(): string | null {
  const candidates = [
    join(process.env["LOCALAPPDATA"] ?? "", "Programs", "Ollama", "ollama.exe"),
    join(process.env["PROGRAMFILES"] ?? "", "Ollama", "ollama.exe"),
    "E:\\Ollama\\ollama.exe",
    "C:\\Ollama\\ollama.exe",
    "D:\\Ollama\\ollama.exe",
    // On macOS/Linux, `ollama` is typically on PATH — handled by spawn fallback
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Ensure Ollama is running. If not, find the executable and start it.
 * Returns the exe path (useful for subsequent pull calls), or null if not found.
 */
export async function ensureOllama(host = DEFAULT_HOST): Promise<string | null> {
  const { ok } = await checkOllama(host);
  if (ok) return findOllamaExe() ?? "ollama";

  const exe = findOllamaExe();
  const cmd = exe ?? "ollama"; // fall back to PATH on non-Windows

  process.stdout.write("Starting Ollama... ");

  const proc = spawn(cmd, ["serve"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  proc.unref(); // don't keep our process alive waiting for it

  // Poll until the server is up (up to 15 s)
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const { ok: ready } = await checkOllama(host);
    if (ready) {
      process.stdout.write("ready.\n");
      return cmd;
    }
  }

  process.stdout.write("timed out.\n");
  return null;
}

/**
 * Ensure the given model is pulled. Streams pull progress to stdout.
 * No-op if the model is already in the pulled list.
 */
export async function ensureModel(
  ollamaCmd: string,
  model: string,
  pulledModels: string[]
): Promise<void> {
  const isPulled = pulledModels.some(
    (m) => m === model || m === model + ":latest" || m.startsWith(model + ":")
  );
  if (isPulled) return;

  console.log(`Pulling ${model} (first-time setup, may take a few minutes)...\n`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ollamaCmd, ["pull", model], {
      stdio: "inherit",
      windowsHide: true,
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ollama pull exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}
