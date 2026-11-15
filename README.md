# Equibles integrations

Agent-framework packages for the [Equibles](https://equibles.com) financial data API: SEC filings and earnings call transcripts, financial statements, prices, insider trades, 13F holders, short interest, guidance and analyst estimates.

| Package | Framework | Install |
|---|---|---|
| [langchain-equibles](langchain-equibles) | LangChain | `pip install langchain-equibles` |
| [strands-equibles](strands-equibles) | Strands Agents | `pip install strands-equibles` |

Each package wraps the same 14 read-only endpoints of the [REST API](https://equibles.com/docs/api), listed in [spec/tools.json](spec/tools.json). A free API key from [equibles.com/dashboard/apikeys](https://equibles.com/dashboard/apikeys) covers all of them.

## Development

Each package has its own tests. From a package folder:

```bash
uv venv && uv pip install -e ".[test]"
.venv/bin/python -m pytest              # unit tests
EQUIBLES_API_KEY=eq_... .venv/bin/python -m pytest -m live   # against the live API
```

The live tests check every wrapped path and parameter against the published OpenAPI document and call each tool once.

## License

MIT
