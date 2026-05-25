import { Box, Text } from "ink";

interface MetaProps {
  version: string;
  repo: string;
  branch: string;
  model: string;
}

export function Meta({ version, repo, branch, model }: MetaProps) {
  return (
    <Box marginBottom={1} flexDirection="column">
      <Text dimColor>{"─".repeat(60)}</Text>
      <Box gap={2}>
        <Text dimColor>v{version}</Text>
        <Text dimColor>·</Text>
        <Text dimColor>
          repo: <Text color="cyan">{repo}</Text>
        </Text>
        <Text dimColor>·</Text>
        <Text dimColor>
          branch: <Text color="cyan">{branch}</Text>
        </Text>
        <Text dimColor>·</Text>
        <Text dimColor>
          model: <Text color="cyan">{model}</Text>
        </Text>
      </Box>
    </Box>
  );
}
