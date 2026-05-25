import { Box, Text } from "ink";

const ART = `
 █████  ██      ███████ ██   ██      ███████
██   ██ ██      ██       ██ ██       ██
███████ ██      █████     ███        ███████
██   ██ ██      ██       ██ ██            ██
██   ██ ███████ ███████ ██   ██      ███████

 ██████  ██ ████████      █████  ███████ ███████ ██ ███████ ████████  █████  ███  ██ ████████
██       ██    ██        ██   ██ ██      ██      ██ ██         ██    ██   ██ ████ ██    ██
██   ███ ██    ██        ███████ ███████ ███████ ██ ███████    ██    ███████ ██ ████    ██
██    ██ ██    ██        ██   ██      ██      ██ ██      ██    ██    ██   ██ ██  ███    ██
 ██████  ██    ██        ██   ██ ███████ ███████ ██ ███████    ██    ██   ██ ██   ██    ██
`.trimStart();

export function Banner() {
  return (
    <Box flexDirection="column" marginBottom={1}>
      {ART.split("\n").map((line, i) => (
        <Text key={i} color="magenta" bold>
          {line}
        </Text>
      ))}
      <Text color="magenta" dimColor>
        {"// by alex"}
      </Text>
    </Box>
  );
}
