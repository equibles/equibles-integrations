# equibles-ai-sdk

[Vercel AI SDK](https://ai-sdk.dev) tools for [Equibles](https://equibles.com): search SEC filings and earnings call transcripts, read financial statements, daily prices, insider trades, 13F holders, short interest, company guidance and analyst estimates. Each tool calls the [Equibles REST API](https://equibles.com/docs/api) and returns its JSON, so the model can quote the filing or call a figure came from.

## Install

```bash
npm install equibles-ai-sdk ai
```

Works with AI SDK 5, 6 and 7, on Node.js 20.3 or later and other runtimes with `fetch`.

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
import { equiblesTools } from 'equibles-ai-sdk';

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
import { equiblesTool } from 'equibles-ai-sdk';

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

## More from Equibles

Equibles is a financial data platform built for AI agents and developers. This package wraps 14 of its REST endpoints; the same account reaches far more data, two ways:

- **MCP server**: over 100 tools that Claude, ChatGPT, Cursor, VS Code and other MCP clients call directly, connected with a URL and no code. [Connect a client](https://equibles.com/docs/mcp)
- **REST API**: JSON endpoints for most of the same data, with the API key this package already uses. [REST reference](https://equibles.com/docs/api/endpoints)

| Data | What it covers |
|---|---|
| [Filings and documents](https://equibles.com/docs/mcp/tools/filings) | SEC filings, plus Canadian and Brazilian filings, searched and read line by line |
| [Earnings calls](https://equibles.com/docs/mcp/tools/earnings) | Call transcripts, analyst questions, earnings briefs, call themes, slides and upcoming investor events |
| [Fundamentals and valuation](https://equibles.com/docs/mcp/tools/fundamentals) | Financial statements, reported facts, valuation multiples, guidance and company KPIs |
| [Analyst estimates](https://equibles.com/docs/mcp/tools/analyst-estimates) | Consensus forecasts, including segment and operating metrics |
| [Prices](https://equibles.com/docs/mcp/tools/prices) | Daily and intraday prices, live quotes, dividends, splits and technical indicators |
| [Options](https://equibles.com/docs/mcp/tools/options) | Chains, greeks, open interest, trades, volatility history and strategy analysis |
| [Institutional holdings (13F)](https://equibles.com/docs/mcp/tools/holdings) | Every stock's holders, manager portfolios and quarterly buying and selling |
| [Funds and advisers](https://equibles.com/docs/mcp/tools/funds), [ETFs](https://equibles.com/docs/mcp/tools/etfs) | Fund and ETF holdings in the US, Europe, Canada and Brazil, and SEC-registered investment advisers |
| [Insider trading](https://equibles.com/docs/mcp/tools/insider) | Insider transactions in the US, Canada, Europe and Brazil, and Form 144 proposed sales |
| [Congressional trading](https://equibles.com/docs/mcp/tools/congress) | Stock trades and net worth of members of Congress |
| [Short selling](https://equibles.com/docs/mcp/tools/short) | Short interest, daily short volume, fails-to-deliver, squeeze scores, and Canadian and European short positions |
| [Economic data and sentiment](https://equibles.com/docs/mcp/tools/economic) | Economic indicators and calendar, CFTC futures positioning, put/call ratios and the VIX |
| [Stock indexes](https://equibles.com/docs/mcp/tools/indexes) | Index composition, changes and inclusion forecasts |
| [Company actions](https://equibles.com/docs/mcp/tools/capital) | Buybacks, at-the-market offerings, executive pay and changes, government contracts, FDA advisory meetings and a stock screener |
| [IPOs](https://equibles.com/docs/mcp/tools/ipos), [debt](https://equibles.com/docs/mcp/tools/debt-profiles), [supply chains](https://equibles.com/docs/mcp/tools/supply-chain) | The S-1 pipeline with prospectus terms, debt instruments, and customers and suppliers |
| [Crypto](https://equibles.com/docs/mcp/tools/crypto), [forex](https://equibles.com/docs/mcp/tools/forex) | Daily and intraday prices and live quotes |

Every plan, Free included, reaches both the MCP server and the REST API; a few data sets, such as option chains and live quotes, need a paid plan. [Plans and pricing](https://equibles.com/pricing)

## Links

- [AI SDK guide on equibles.com](https://equibles.com/docs/api/ai-sdk)
- [REST API reference](https://equibles.com/docs/api)
- [Issues](https://github.com/equibles/equibles-integrations/issues)

## License

MIT
