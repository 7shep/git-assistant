import { useState, useCallback } from "react";
import { Box, useApp } from "ink";
import { Banner } from "./components/Banner.js";
import { Meta } from "./components/Meta.js";
import { Message, type Exchange } from "./components/Message.js";
import { Prompt } from "./components/Prompt.js";
import { chat } from "./lib/llm.js";

const VERSION = "0.1.0";

interface AppProps {
  cwd: string;
  repoName: string;
  branch: string;
  model: string;
}

export function App({ cwd, repoName, branch, model }: AppProps) {
  const { exit } = useApp();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const handleSubmit = useCallback(
    (value: string) => {
      const question = value.trim();
      if (!question) return;

      // Built-in exit commands
      if (question === "exit" || question === "quit" || question === "q") {
        exit();
        return;
      }

      setInput("");
      setThinking(true);

      // Index of the new exchange we're about to push
      const idx = exchanges.length;

      setExchanges((prev) => [
        ...prev,
        { question, toolCalls: [], answer: "", done: false },
      ]);

      // Build prior conversation context (completed exchanges only)
      const history = exchanges
        .filter((ex) => ex.done && !ex.error)
        .flatMap((ex) => [
          { role: "user" as const, content: ex.question },
          { role: "assistant" as const, content: ex.answer },
        ]);

      chat(history, question, cwd, model, {
        onToken: (delta) => {
          setExchanges((prev) => {
            const updated = [...prev];
            const ex = updated[idx];
            if (ex) updated[idx] = { ...ex, answer: ex.answer + delta };
            return updated;
          });
        },
        onToolCall: (toolName, args) => {
          setExchanges((prev) => {
            const updated = [...prev];
            const ex = updated[idx];
            if (ex) {
              updated[idx] = {
                ...ex,
                toolCalls: [...ex.toolCalls, { name: toolName, args }],
              };
            }
            return updated;
          });
        },
        onDone: () => {
          setExchanges((prev) => {
            const updated = [...prev];
            const ex = updated[idx];
            if (ex) updated[idx] = { ...ex, done: true };
            return updated;
          });
          setThinking(false);
        },
        onError: (err) => {
          setExchanges((prev) => {
            const updated = [...prev];
            const ex = updated[idx];
            if (ex) {
              updated[idx] = { ...ex, done: true, error: err.message };
            }
            return updated;
          });
          setThinking(false);
        },
      });
    },
    [exchanges, cwd, model, exit]
  );

  return (
    <Box flexDirection="column" paddingX={1}>
      <Banner />
      <Meta version={VERSION} repo={repoName} branch={branch} model={model} />

      {exchanges.map((ex, i) => (
        <Message key={i} exchange={ex} />
      ))}

      <Prompt
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={thinking}
      />
    </Box>
  );
}
