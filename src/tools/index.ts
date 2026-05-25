import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as status from "./status.js";
import * as log from "./log.js";
import * as diff from "./diff.js";
import * as branches from "./branches.js";
import * as show from "./show.js";
import * as blame from "./blame.js";

export interface Tool {
  name: string;
  description: string;
  /** JSON Schema (OpenAI / Ollama compatible) */
  parameters: Record<string, unknown>;
  /** Raw Zod schema — used by the MCP server for tool registration */
  inputSchema: z.ZodTypeAny;
  run: (rawInput: unknown, cwd: string) => Promise<string>;
}

function makeTool(
  mod: {
    name: string;
    description: string;
    inputSchema: { _def?: unknown } & Parameters<typeof zodToJsonSchema>[0];
    run: (rawInput: unknown, cwd: string) => Promise<string>;
  }
): Tool {
  const jsonSchema = zodToJsonSchema(mod.inputSchema, {
    $refStrategy: "none",
    target: "openApi3",
  }) as Record<string, unknown>;

  // Strip $schema key — Ollama doesn't need it and some models choke on it
  delete jsonSchema["$schema"];

  return {
    name: mod.name,
    description: mod.description,
    parameters: jsonSchema,
    inputSchema: mod.inputSchema as z.ZodTypeAny,
    run: mod.run,
  };
}

export const tools: Tool[] = [
  makeTool(status),
  makeTool(log),
  makeTool(diff),
  makeTool(branches),
  makeTool(show),
  makeTool(blame),
];

export const byName: Record<string, Tool> = Object.fromEntries(
  tools.map((t) => [t.name, t])
);
