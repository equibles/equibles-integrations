import type { ToolExecutionOptions } from 'ai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EquiblesAPIError, TOOL_SPECS, equiblesTool, equiblesTools } from '../../src/index.js';

const KEY = 'eq_test_key';
const OPTIONS = { toolCallId: 'call-1', messages: [], context: undefined } as unknown as ToolExecutionOptions<unknown>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function mockFetch(response: Response) {
  return vi.fn<typeof fetch>(async () => response.clone());
}

function urlOf(fetch: ReturnType<typeof mockFetch>, call = 0): URL {
  return new URL(String(fetch.mock.calls[call]![0]));
}

async function run(name: Parameters<typeof equiblesTool>[0], input: Record<string, unknown>, fetch: typeof globalThis.fetch) {
  const tool = equiblesTool(name, { apiKey: KEY, fetch });
  return tool.execute!(input as never, OPTIONS);
}

describe('equiblesTools', () => {
  const saved = process.env.EQUIBLES_API_KEY;
  beforeEach(() => {
    delete process.env.EQUIBLES_API_KEY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.EQUIBLES_API_KEY;
    else process.env.EQUIBLES_API_KEY = saved;
  });

  it('returns one tool per spec, each declaring its required parameters', async () => {
    const tools = equiblesTools({ apiKey: KEY });
    expect(Object.keys(tools).sort()).toEqual(TOOL_SPECS.map((s) => s.name).sort());
    const schema = await tools.readFilingLines.inputSchema;
    const json = (schema as { jsonSchema: { required: string[]; properties: Record<string, unknown> } }).jsonSchema;
    expect(json.required).toEqual(['documentId', 'startLine', 'endLine']);
    expect(Object.keys(json.properties)).toEqual(['documentId', 'startLine', 'endLine']);
  });

  it('reads the key from EQUIBLES_API_KEY when no apiKey is passed', async () => {
    process.env.EQUIBLES_API_KEY = KEY;
    const fetch = mockFetch(jsonResponse({ ok: true }));
    const tools = equiblesTools({ fetch });
    await tools.getStockProfile.execute!({ ticker: 'NVDA' } as never, OPTIONS);
    const init = fetch.mock.calls[0]![1]!;
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${KEY}`);
  });

  it('refuses to build without a key and says where to get one', () => {
    expect(() => equiblesTools()).toThrow(/EQUIBLES_API_KEY.*equibles\.com\/dashboard\/apikeys/s);
  });

  it('refuses a key with a space without quoting it', () => {
    const bad = 'eq_secret value';
    let message = '';
    try {
      equiblesTools({ apiKey: bad });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/space, control or non-ASCII/);
    expect(message).not.toContain('secret');
  });

  it('names the valid tools when asked for an unknown one', () => {
    expect(() => equiblesTool('nope' as never, { apiKey: KEY })).toThrow(/searchCompanyFilings/);
  });
});

describe('tool execution', () => {
  it('puts path arguments in the path and the rest in the query', async () => {
    const fetch = mockFetch(jsonResponse({ data: [] }));
    await run('getEarningsCallTranscript', { ticker: 'NVDA', fiscalYear: 2026, fiscalQuarter: 3, limit: 2 }, fetch);
    expect(urlOf(fetch).toString()).toBe('https://api.equibles.com/v1/stocks/NVDA/earnings-calls/2026/3/speakers?limit=2');
  });

  it('keeps the colon of MIC:TICKER and encodes a slash so the value stays one segment', async () => {
    const fetch = mockFetch(jsonResponse({}));
    await run('getStockProfile', { ticker: 'XETR:SIE' }, fetch);
    await run('getStockProfile', { ticker: 'BRK/B' }, fetch);
    expect(urlOf(fetch, 0).pathname).toBe('/v1/stocks/XETR:SIE');
    expect(urlOf(fetch, 1).pathname).toBe('/v1/stocks/BRK%2FB');
  });

  it('drops arguments the tool does not declare', async () => {
    const fetch = mockFetch(jsonResponse({}));
    await run('getShortInterest', { ticker: 'NVDA', limit: 2, invented: 'x' }, fetch);
    expect(urlOf(fetch).search).toBe('?limit=2');
  });

  it('returns the parsed JSON answer', async () => {
    const fetch = mockFetch(jsonResponse({ data: [{ close: 87.64 }] }));
    await expect(run('getStockPrices', { ticker: 'ANT' }, fetch)).resolves.toEqual({ data: [{ close: 87.64 }] });
  });

  it('refuses a missing required argument before calling the API', async () => {
    const fetch = mockFetch(jsonResponse({}));
    await expect(run('readFilingLines', { documentId: 'abc', startLine: 1 }, fetch)).rejects.toThrow(/endLine/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('refuses a dot-segment path value that would move the request to another route', async () => {
    const fetch = mockFetch(jsonResponse({}));
    await expect(run('getStockProfile', { ticker: '..' }, fetch)).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes on the API's own error message and code", async () => {
    const fetch = mockFetch(jsonResponse({ error: { code: 'not_found', message: 'No listing NOPE.' } }, 404));
    const error = await run('getStockProfile', { ticker: 'NOPE' }, fetch).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EquiblesAPIError);
    expect(error).toMatchObject({ status: 404, code: 'not_found', message: 'No listing NOPE.' });
  });

  it('falls back to the response text when the error is not JSON', async () => {
    const fetch = mockFetch(new Response('Bad gateway', { status: 502 }));
    await expect(run('getStockProfile', { ticker: 'NVDA' }, fetch)).rejects.toMatchObject({ status: 502, message: 'Bad gateway' });
  });

  it('reports an unreachable API as status 0 without the key', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError(`fetch failed for Bearer ${KEY}`);
    });
    const error = (await run('getStockProfile', { ticker: 'NVDA' }, fetch).catch((e: unknown) => e)) as EquiblesAPIError;
    expect(error.status).toBe(0);
    expect(error.message).toBe('Could not reach the Equibles API (TypeError).');
  });

  it("rethrows the caller's abort instead of reporting the API unreachable", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetch = vi.fn<typeof globalThis.fetch>(async (_url, init) => {
      init!.signal!.throwIfAborted();
      return jsonResponse({});
    });
    const tool = equiblesTool('getStockProfile', { apiKey: KEY, fetch });
    const error = await Promise.resolve(
      tool.execute!({ ticker: 'NVDA' } as never, { ...OPTIONS, abortSignal: controller.signal }),
    ).catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(EquiblesAPIError);
    expect((error as Error).name).toBe('AbortError');
  });
});
