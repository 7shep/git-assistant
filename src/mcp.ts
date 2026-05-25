#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { tools } from "./tools/index.js";
import { resolveRepo } from "./lib/git.js";

const server = new McpServer({ name: "git-assistant", version: "0.1.0" });

for (const tool of tools) {
  // Wrap each tool's schema with an optional repo param so Claude Code
  // can target any repo, not just the server's working directory.
  const schemaWithRepo = (tool.inputSchema as z.ZodObject<z.ZodRawShape>).extend({
    repo: z
      .string()
      .optional()
      .describe(
        "Absolute path to the git repository. Defaults to the current working directory."
      ),
  });

  server.registerTool(
    tool.name,
    { description: tool.description, inputSchema: schemaWithRepo },
    async (input) => {
      const { repo, ...rest } = input as { repo?: string } & Record<string, unknown>;
      const cwd = await resolveRepo(repo ?? process.cwd());
      const text = await tool.run(rest, cwd);
      return { content: [{ type: "text" as const, text }] };
    }
  );
}

await server.connect(new StdioServerTransport());
