import { Text } from "ink";

interface ToolCallProps {
  name: string;
  args: Record<string, unknown>;
}

export function ToolCall({ name, args }: ToolCallProps) {
  // Show non-empty args inline, truncated to keep output readable
  const argStr = Object.keys(args).length > 0 ? JSON.stringify(args) : "";
  const display = argStr.length > 80 ? argStr.slice(0, 77) + "..." : argStr;

  return (
    <Text color="yellow" dimColor>
      {"  ▶ calling "}{name}
      {display ? <Text color="yellow" dimColor>{" "}{display}</Text> : null}
    </Text>
  );
}
