import { jsonSchema, tool, type Tool } from 'ai';

import { EquiblesClient, type EquiblesClientOptions } from './client.js';
import { TOOL_SPECS, type EquiblesToolName, type ToolSpec } from './spec.js';

export type EquiblesToolsOptions = EquiblesClientOptions;

/** A tool's arguments: the parameters its spec declares, by name. */
export type EquiblesToolInput = Record<string, string | number | boolean | undefined>;

export type EquiblesToolSet = { [Name in EquiblesToolName]: Tool<EquiblesToolInput, unknown> };

function makeTool(spec: ToolSpec, client: EquiblesClient): Tool<EquiblesToolInput, unknown> {
  const known = new Set(spec.params.map((p) => p.name));
  const required = spec.params.filter((p) => p.required).map((p) => p.name);
  return tool({
    description: spec.description,
    inputSchema: jsonSchema<EquiblesToolInput>({
      type: 'object',
      properties: Object.fromEntries(
        spec.params.map((p) => [p.name, { type: p.type, description: p.description }]),
      ),
      required,
    }),
    execute: async (input, { abortSignal }) => {
      // Models sometimes add arguments the tool never declared; the API would reject them.
      const args = Object.fromEntries(Object.entries(input ?? {}).filter(([name]) => known.has(name)));
      const missing = required.filter((name) => args[name] === undefined || args[name] === null);
      if (missing.length > 0) {
        throw new Error(`Missing required argument(s): ${missing.join(', ')}.`);
      }
      return client.call(spec, args, abortSignal);
    },
  });
}

/**
 * All 14 Equibles tools sharing one API client, for `generateText({ tools: equiblesTools() })`.
 * The key comes from `apiKey` or the EQUIBLES_API_KEY environment variable.
 */
export function equiblesTools(options: EquiblesToolsOptions = {}): EquiblesToolSet {
  const client = new EquiblesClient(options);
  return Object.fromEntries(TOOL_SPECS.map((spec) => [spec.name, makeTool(spec, client)])) as EquiblesToolSet;
}

/** One tool by name, e.g. `equiblesTool('searchCompanyFilings')`. */
export function equiblesTool(name: EquiblesToolName, options: EquiblesToolsOptions = {}): Tool<EquiblesToolInput, unknown> {
  const spec = TOOL_SPECS.find((s) => s.name === name);
  if (!spec) {
    throw new Error(`Unknown Equibles tool ${JSON.stringify(name)}; choose one of ${TOOL_SPECS.map((s) => s.name).join(', ')}.`);
  }
  return makeTool(spec, new EquiblesClient(options));
}
