import { Box, Text } from "ink";
import TextInput from "ink-text-input";

interface PromptProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: (val: string) => void;
  disabled?: boolean;
}

export function Prompt({ value, onChange, onSubmit, disabled = false }: PromptProps) {
  return (
    <Box>
      <Text color="cyan" bold>
        {"❯ "}
      </Text>
      {disabled ? (
        <Text dimColor>{"thinking..."}</Text>
      ) : (
        <TextInput
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          placeholder="ask anything about this repo…"
        />
      )}
    </Box>
  );
}
