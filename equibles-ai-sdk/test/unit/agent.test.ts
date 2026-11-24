import { generateText, isStepCount } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';

import { equiblesTools } from '../../src/index.js';

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 5, text: 5, reasoning: undefined },
};

function toolCallThenAnswer(toolName: string, input: unknown) {
  return [
    {
      content: [{ type: 'tool-call' as const, toolCallId: 'call-1', toolName, input: JSON.stringify(input) }],
      finishReason: { unified: 'tool-calls' as const, raw: 'tool_use' },
      usage,
      warnings: [],
    },
    {
      content: [{ type: 'text' as const, text: 'done' }],
      finishReason: { unified: 'stop' as const, raw: 'end_turn' },
      usage,
      warnings: [],
    },
  ];
}

// The second model call's prompt carries what the tool handed back to the model.
function toolResultSentBack(model: MockLanguageModelV4): string {
  return JSON.stringify(model.doGenerateCalls[1]!.prompt.filter((m) => m.role === 'tool'));
}

describe('generateText with equiblesTools', () => {
  it("runs the model's tool call against the API and sends the answer back", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ ticker: 'NVDA', name: 'NVIDIA Corp' }), { status: 200 }));
    const model = new MockLanguageModelV4({ doGenerate: toolCallThenAnswer('getStockProfile', { ticker: 'NVDA' }) });

    const { text } = await generateText({
      model,
      prompt: 'What does Nvidia do?',
      tools: equiblesTools({ apiKey: 'eq_test', fetch }),
      stopWhen: isStepCount(3),
    });

    expect(text).toBe('done');
    expect(fetch).toHaveBeenCalledOnce();
    expect(toolResultSentBack(model)).toContain('NVIDIA Corp');
  });

  it('offers every tool to the model with its JSON schema', async () => {
    const model = new MockLanguageModelV4({ doGenerate: toolCallThenAnswer('getStockProfile', { ticker: 'NVDA' }).slice(1) });
    await generateText({ model, prompt: 'hi', tools: equiblesTools({ apiKey: 'eq_test' }) });
    const offered = model.doGenerateCalls[0]!.tools ?? [];
    expect(offered).toHaveLength(14);
    const search = offered.find((t) => t.name === 'searchCompanyFilings') as { inputSchema: { required: string[] } };
    expect(search.inputSchema.required).toEqual(['ticker', 'query']);
  });

  it("hands the API's error message to the model so it can correct the call", async () => {
    const fetch = vi.fn(
      async () => new Response(JSON.stringify({ error: { code: 'not_found', message: 'No listing NOPE.' } }), { status: 404 }),
    );
    const model = new MockLanguageModelV4({ doGenerate: toolCallThenAnswer('getStockProfile', { ticker: 'NOPE' }) });

    await generateText({
      model,
      prompt: 'Profile NOPE',
      tools: equiblesTools({ apiKey: 'eq_test', fetch }),
      stopWhen: isStepCount(3),
    });

    expect(toolResultSentBack(model)).toContain('No listing NOPE.');
  });
});
