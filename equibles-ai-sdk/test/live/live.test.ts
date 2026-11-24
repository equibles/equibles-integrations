// Live checks against api.equibles.com; run with `EQUIBLES_API_KEY=eq_... npm run test:live`.
import type { ToolExecutionOptions } from 'ai';
import { beforeAll, describe, expect, it } from 'vitest';

import { TOOL_SPECS, equiblesTools, type EquiblesToolName, type EquiblesToolSet } from '../../src/index.js';

const OPENAPI_URL = 'https://api.equibles.com/openapi/v1.json';
const OPTIONS = { toolCallId: 'live', messages: [], context: undefined } as unknown as ToolExecutionOptions<unknown>;
const hasKey = Boolean(process.env.EQUIBLES_API_KEY);

type OpenApi = { paths: Record<string, { get?: { parameters?: { name: string; in: string }[] } }> };

describe('the live OpenAPI document', () => {
  let openapi: OpenApi;
  beforeAll(async () => {
    openapi = (await (await fetch(OPENAPI_URL)).json()) as OpenApi;
  });

  it.each(TOOL_SPECS.map((s) => [s.name, s] as const))('declares every path and parameter %s wraps', (_name, spec) => {
    const operation = openapi.paths[spec.path]?.get;
    expect(operation, `${spec.path} is not a GET route in the API`).toBeDefined();
    const declared = Object.fromEntries((operation!.parameters ?? []).map((p) => [p.name, p.in]));
    for (const param of spec.params) {
      const expected = spec.path.includes(`{${param.name}}`) ? 'path' : 'query';
      expect(declared[param.name], `${spec.name}.${param.name}`).toBe(expected);
    }
  });
});

// One real call per tool, chained where an argument comes from another tool's answer.
const EXAMPLES: Partial<Record<EquiblesToolName, Record<string, unknown>>> = {
  searchListings: { query: 'nvidia', limit: 3 },
  getStockProfile: { ticker: 'NVDA' },
  getStockPrices: { ticker: 'NVDA', limit: 5 },
  getFinancialStatement: { ticker: 'NVDA', statement: 'income' },
  searchCompanyFilings: { ticker: 'NVDA', query: 'Data Center revenue', limit: 2 },
  searchAllFilings: { query: 'share repurchase program', limit: 2, maxResultsPerCompany: 1 },
  listInvestorEvents: { ticker: 'NVDA', eventType: 'EarningsCall', limit: 4 },
  getInsiderTransactions: { ticker: 'NVDA', limit: 3 },
  getInstitutionalHolders: { ticker: 'NVDA', limit: 3 },
  getShortInterest: { ticker: 'NVDA', limit: 2 },
  getGuidance: { ticker: 'NVDA', maxReleases: 1 },
  getAnalystEstimates: { ticker: 'NVDA', limit: 5 },
};

describe.skipIf(!hasKey)('each tool against the live API', () => {
  let tools: EquiblesToolSet;
  beforeAll(() => {
    tools = equiblesTools();
  });

  const call = async (name: EquiblesToolName, input: Record<string, unknown>) =>
    (await tools[name].execute!(input as never, OPTIONS)) as { data?: Record<string, unknown>[] };

  it.each(Object.entries(EXAMPLES))('%s answers JSON', async (name, input) => {
    expect(await call(name as EquiblesToolName, input)).toBeTruthy();
  }, 60_000);

  it('reads a transcript and filing lines from ids other tools return', async () => {
    const events = await call('listInvestorEvents', EXAMPLES.listInvestorEvents!);
    const event = events.data!.find((e) => e.hasTranscript)!;
    const transcript = await call('getEarningsCallTranscript', {
      ticker: 'NVDA',
      fiscalYear: event.fiscalYear,
      fiscalQuarter: event.fiscalQuarter,
      limit: 2,
    });
    expect(transcript.data!.length).toBeGreaterThan(0);

    const hits = await call('searchCompanyFilings', EXAMPLES.searchCompanyFilings!);
    const lines = await call('readFilingLines', { documentId: hits.data![0]!.documentId, startLine: 1, endLine: 5 });
    expect(lines).toBeTruthy();
  }, 120_000);
});
