import { Box, Text } from "ink";
import { ToolCall } from "./ToolCall.js";

export interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
}

export interface Exchange {
  question: string;
  toolCalls: ToolCallRecord[];
  answer: string;
  done: boolean;
  error?: string;
}

interface MessageProps {
  exchange: Exchange;
}

export function Message({ exchange }: MessageProps) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* User question */}
      <Text>
        <Text color="cyan" bold>
          {"❯ "}
        </Text>
        <Text>{exchange.question}</Text>
      </Text>

      {/* Tool call indicators */}
      {exchange.toolCalls.map((tc, i) => (
        <ToolCall key={i} name={tc.name} args={tc.args} />
      ))}

      {/* Streamed answer or error */}
      {exchange.error ? (
        <Text color="red">{"  Error: "}{exchange.error}</Text>
      ) : exchange.answer ? (
        <Box marginLeft={2} flexDirection="column">
          {exchange.answer.split("\n").map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </Box>
      ) : !exchange.done ? null : (
        <Text dimColor>{"  (no response)"}</Text>
      )}
    </Box>
  );
}
