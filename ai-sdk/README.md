# @equibles/ai-sdk

[Vercel AI SDK](https://ai-sdk.dev) tools for [Equibles](https://equibles.com): search SEC filings and earnings call transcripts, read financial statements, daily prices, insider trades, 13F holders, short interest, company guidance and analyst estimates. Each tool calls the [Equibles REST API](https://equibles.com/docs/api) and returns its JSON, so the model can quote the filing or call a figure came from.

## Install

```bash
npm install @equibles/ai-sdk ai
```

Works with AI SDK 5, 6 and 7, on Node.js 20 or later and other runtimes with `fetch`.

## API key

Create a free key at [equibles.com/dashboard/apikeys](https://equibles.com/dashboard/apikeys) (it starts with `eq_`) and set it:

```bash
export EQUIBLES_API_KEY=eq_your_api_key
```

Or pass `apiKey: 'eq_...'` to `equiblesTools` or `equiblesTool`.

## Use

All tools, sharing one API client:

```ts
import { generateText, isStepCount } from 'ai';
import { equiblesTools } from '@equibles/ai-sdk';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-5.5',
  prompt: 'What did NVIDIA guide for next quarter, and have insiders bought or sold since?',
  tools: equiblesTools(),
  stopWhen: isStepCount(8),
});

console.log(text);
```

On AI SDK 5 and 6, import `stepCountIs` instead of `isStepCount`. A model string goes through the [Vercel AI Gateway](https://vercel.com/ai-gateway); any provider package works too.

Only the tools you need:

```ts
import { equiblesTool } from '@equibles/ai-sdk';

const tools = {
  searchCompanyFilings: equiblesTool('searchCompanyFilings'),
  readFilingLines: equiblesTool('readFilingLines'),
};
```

## Tools

| Tool | What it returns |
|---|---|
| `searchListings` | Listings matching a company name, ticker or ISIN, with the symbol the other tools accept |
| `getStockProfile` | Company description, sector and industry, CIK, fiscal year end, ISIN and other listings |
| `getStockPrices` | Daily, weekly or monthly open, high, low, close and volume |
| `getFinancialStatement` | Income statement, balance sheet or cash-flow statement for one fiscal period, from SEC XBRL filings |
| `searchCompanyFilings` | Matching excerpts from one company's SEC filings and earnings call transcripts |
| `searchAllFilings` | The same search across every company, for questions like which companies mention a topic |
| `readFilingLines` | A range of numbered lines from one filing or transcript, by the document id a search returned |
| `listInvestorEvents` | Earnings calls (with whether a transcript exists), conferences, investor days and shareholder meetings |
| `getEarningsCallTranscript` | A fiscal quarter's earnings call, speaker by speaker, paged |
| `getInsiderTransactions` | Insider purchases, sales and awards from SEC Forms 4 and 5 |
| `getInstitutionalHolders` | The largest 13F holders of a stock or ETF |
| `getShortInterest` | FINRA short interest twice a month, with days to cover |
| `getGuidance` | Guided metrics from 8-K results releases and earnings calls, with the verbatim disclosure |
| `getAnalystEstimates` | Analyst consensus, including segment and operating forecasts |

US stocks use the bare ticker (`AAPL`, `BRK-B`); a listing on another exchange uses `MIC:TICKER` (`XETR:SIE`), which `searchListings` returns.

All 14 tools work on the Free plan, within its daily call limit ([rate limits](https://equibles.com/docs/rate-limits)).

## Errors

An API error, such as an unknown ticker, is thrown as an `EquiblesAPIError` carrying the API's message, status and code. Inside `generateText` or `streamText` the AI SDK hands that message to the model as a tool error, so it can correct its call.

## Hosted MCP server instead

The AI SDK's MCP client can also connect to the Equibles MCP server, which has more tools and needs no package: [MCP setup](https://equibles.com/docs/mcp).

## Links

- [AI SDK guide on equibles.com](https://equibles.com/docs/api/ai-sdk)
- [REST API reference](https://equibles.com/docs/api)
- [Issues](https://github.com/equibles/equibles-integrations/issues)

## License

MIT
