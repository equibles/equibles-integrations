# langchain-equibles

LangChain tools for [Equibles](https://equibles.com): search SEC filings and earnings call transcripts, read financial statements, daily prices, insider trades, 13F holders, short interest, company guidance and analyst estimates. Each tool calls the [Equibles REST API](https://equibles.com/docs/api) and returns its JSON, so an agent can quote the filing or call a figure came from.

## Install

```bash
pip install langchain-equibles
```

Python 3.10 or later.

## API key

Create a free key at [equibles.com/dashboard/apikeys](https://equibles.com/dashboard/apikeys) (it starts with `eq_`) and export it:

```bash
export EQUIBLES_API_KEY=eq_your_api_key
```

Or pass `api_key="eq_..."` to `EquiblesToolkit` or `get_tool`.

## Use

All tools, sharing one API client:

```python
# pip install langchain langchain-anthropic
from langchain.agents import create_agent
from langchain_equibles import EquiblesToolkit

tools = EquiblesToolkit().get_tools()
agent = create_agent("anthropic:claude-sonnet-5-5", tools=tools)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "What did NVIDIA say about Data Center revenue in its latest 10-Q?"}]}
)
print(result["messages"][-1].content)
```

One tool on its own:

```python
from langchain_equibles import get_tool

search = get_tool("search_company_filings")
print(search.invoke({"ticker": "NVDA", "query": "Data Center revenue", "documentType": "10-Q"}))
```

## Tools

| Tool | What it returns |
|---|---|
| `search_listings` | Listings matching a company name, ticker or ISIN, with the symbol the other tools accept |
| `get_stock_profile` | Company description, sector and industry, CIK, fiscal year end, ISIN and other listings |
| `get_stock_prices` | Daily, weekly or monthly open, high, low, close and volume |
| `get_financial_statement` | Income statement, balance sheet or cash-flow statement for one fiscal period, from SEC XBRL filings |
| `search_company_filings` | Matching excerpts from one company's SEC filings and earnings call transcripts |
| `search_all_filings` | The same search across every company, for questions like which companies mention a topic |
| `read_filing_lines` | A range of numbered lines from one filing or transcript, by the document id a search returned |
| `list_investor_events` | Earnings calls (with whether a transcript exists), conferences, investor days and shareholder meetings |
| `get_earnings_call_transcript` | A fiscal quarter's earnings call, speaker by speaker, paged |
| `get_insider_transactions` | Insider purchases, sales and awards from SEC Forms 4 and 5 |
| `get_institutional_holders` | The largest 13F holders of a stock or ETF |
| `get_short_interest` | FINRA short interest twice a month, with days to cover |
| `get_guidance` | Guided metrics from 8-K results releases and earnings calls, with the verbatim disclosure |
| `get_analyst_estimates` | Analyst consensus, including segment and operating forecasts |

US stocks use the bare ticker (`AAPL`, `BRK-B`); a listing on another exchange uses `MIC:TICKER` (`XETR:SIE`), which `search_listings` returns.

All 14 tools work on the Free plan, within its daily call limit ([rate limits](https://equibles.com/docs/rate-limits)).

## Errors

An API error, such as an unknown ticker, comes back as the tool's answer text, so the agent can correct its call. Set `handle_tool_error = False` on a tool to raise `ToolException` instead.

## Links

- [LangChain guide on equibles.com](https://equibles.com/docs/api/langchain)
- [REST API reference](https://equibles.com/docs/api)
- [Issues](https://github.com/equibles/equibles-integrations/issues)

## License

MIT
