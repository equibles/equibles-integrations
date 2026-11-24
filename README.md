# Equibles integrations

Agent-framework packages for the [Equibles](https://equibles.com) financial data API: SEC filings and earnings call transcripts, financial statements, prices, insider trades, 13F holders, short interest, guidance and analyst estimates.

| Package | Framework | Install |
|---|---|---|
| [langchain-equibles](langchain-equibles) | LangChain | `pip install langchain-equibles` |
| [strands-equibles](strands-equibles) | Strands Agents | `pip install strands-equibles` |
| [equibles-ai-sdk](equibles-ai-sdk) | Vercel AI SDK | `npm install equibles-ai-sdk` |

Each package wraps the same 14 read-only endpoints of the [REST API](https://equibles.com/docs/api), listed in [spec/tools.json](spec/tools.json). A free API key from [equibles.com/dashboard/apikeys](https://equibles.com/dashboard/apikeys) covers all of them.

## More from Equibles

Equibles is a financial data platform built for AI agents and developers. These packages wrap 14 of its REST endpoints; the same account reaches far more data, two ways:

- **MCP server**: over 100 tools that Claude, ChatGPT, Cursor, VS Code and other MCP clients call directly, connected with a URL and no code. [Connect a client](https://equibles.com/docs/mcp)
- **REST API**: JSON endpoints for most of the same data, with the API key these packages already use. [REST reference](https://equibles.com/docs/api/endpoints)

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

## Development

Each package has its own tests. From a Python package folder:

```bash
uv venv && uv pip install -e ".[test]"
.venv/bin/python -m pytest              # unit tests
EQUIBLES_API_KEY=eq_... .venv/bin/python -m pytest -m live   # against the live API
```

From `equibles-ai-sdk`:

```bash
npm install && npm test                          # unit tests
EQUIBLES_API_KEY=eq_... npm run test:live        # against the live API
```

The live tests check every wrapped path and parameter against the published OpenAPI document and call each tool once.

## License

MIT
