"""The Equibles REST endpoints these tools wrap, one entry per tool.

Every path and parameter here must exist in https://api.equibles.com/openapi/v1.json;
the contract test checks this against the live document.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Param:
    name: str
    type: str  # JSON Schema type: "string", "integer" or "boolean"
    description: str
    required: bool = False


@dataclass(frozen=True)
class ToolSpec:
    name: str
    path: str
    description: str
    params: tuple[Param, ...] = field(default_factory=tuple)

    @property
    def path_params(self) -> tuple[str, ...]:
        return tuple(p.name for p in self.params if "{" + p.name + "}" in self.path)


_TICKER = Param(
    "ticker",
    "string",
    "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).",
    required=True,
)
_LIMIT = Param("limit", "integer", "Maximum rows to return.")
_OFFSET = Param("offset", "integer", "Rows to skip before the first returned row (default 0).")
_START = Param("startDate", "string", "Earliest date to include (yyyy-MM-dd).")
_END = Param("endDate", "string", "Latest date to include (yyyy-MM-dd).")
_QUERY = Param(
    "query",
    "string",
    "Plain keywords or a short phrase, worded the way a filing would say it (e.g. 'Data Center revenue').",
    required=True,
)
_DOC_TYPE = Param(
    "documentType",
    "string",
    "Optional document type filter, one value or a comma-separated list by form label (e.g. 10-K,10-Q).",
)

TOOLS: tuple[ToolSpec, ...] = (
    ToolSpec(
        "search_listings",
        "/v1/listings",
        "Find stock listings by company name or ticker, or by ISIN, across US and other exchanges. "
        "Returns the symbol the other Equibles tools accept: a bare ticker for a US listing, MIC:TICKER elsewhere.",
        (
            Param("query", "string", "Company name or ticker to search for (e.g. siemens, ASML or XETR:SIE)."),
            Param("isin", "string", "ISIN to look up (e.g. IE00B5BMR087); cannot be combined with query."),
            _LIMIT,
        ),
    ),
    ToolSpec(
        "get_stock_profile",
        "/v1/stocks/{ticker}",
        "A listing's profile: company description, website, sector and industry, CIK, fiscal year end, "
        "ISIN and the company's other listings.",
        (_TICKER,),
    ),
    ToolSpec(
        "get_stock_prices",
        "/v1/stocks/{ticker}/prices",
        "Daily open, high, low, close and volume history for a stock, newest first, in the listing's trading currency.",
        (
            _TICKER,
            Param("startDate", "string", "Start date (yyyy-MM-dd, defaults to one year ago)."),
            Param("endDate", "string", "End date (yyyy-MM-dd, defaults to today)."),
            Param("interval", "string", "daily (default), weekly or monthly."),
            _LIMIT,
        ),
    ),
    ToolSpec(
        "get_financial_statement",
        "/v1/stocks/{ticker}/financial-statements/{statement}",
        "A company's income statement, balance sheet or cash-flow statement for one fiscal period, "
        "from its SEC XBRL filings, with the latest restatement of each line.",
        (
            _TICKER,
            Param("statement", "string", "income, balance or cashflow.", required=True),
            Param("year", "integer", "Fiscal year; omit with period for the latest available period."),
            Param("period", "string", "Fiscal period: FY or Q1 through Q4."),
        ),
    ),
    ToolSpec(
        "search_company_filings",
        "/v1/stocks/{ticker}/filings/search",
        "Search one company's SEC filings and earnings call transcripts. Returns matching excerpts with "
        "their document ids and line numbers, which read_filing_lines can expand.",
        (_TICKER, _QUERY, _DOC_TYPE, _START, _END, Param("limit", "integer", "Maximum excerpts to return (default 5).")),
    ),
    ToolSpec(
        "search_all_filings",
        "/v1/filings/search",
        "Search every company's SEC filings and earnings call transcripts at once, for questions like "
        "which companies mention a topic. Returns excerpts with their tickers and document ids.",
        (
            _QUERY,
            _DOC_TYPE,
            _START,
            _END,
            Param("limit", "integer", "Maximum excerpts to return (default 5)."),
            Param("maxResultsPerCompany", "integer", "Cap excerpts per company to spread results across more companies."),
        ),
    ),
    ToolSpec(
        "read_filing_lines",
        "/v1/filings/{documentId}/lines",
        "Read a range of numbered text lines from one filing or transcript, by the document id a search returned.",
        (
            Param("documentId", "string", "Document id from a filing search or list.", required=True),
            Param("startLine", "integer", "First line to read (1-based).", required=True),
            Param("endLine", "integer", "Last line to read; at most 500 lines come back per call.", required=True),
        ),
    ),
    ToolSpec(
        "list_investor_events",
        "/v1/stocks/{ticker}/investor-events",
        "A company's investor events, newest first, including scheduled ones: earnings calls with their "
        "fiscal year, quarter and whether a transcript exists, plus conferences, investor days and shareholder meetings.",
        (
            _TICKER,
            Param(
                "eventType",
                "string",
                "Optional: EarningsCall, CapitalMarketsDay, InvestorUpdate, AGM, Conference, FiresideChat or MAndA.",
            ),
            _LIMIT,
        ),
    ),
    ToolSpec(
        "get_earnings_call_transcript",
        "/v1/stocks/{ticker}/earnings-calls/{fiscalYear}/{fiscalQuarter}/speakers",
        "The speaker-labelled transcript of a fiscal quarter's earnings call, turn by turn. "
        "Long calls page with offset; the response says whether more turns follow.",
        (
            _TICKER,
            Param("fiscalYear", "integer", "Fiscal year the quarter belongs to (e.g. 2025).", required=True),
            Param("fiscalQuarter", "integer", "Fiscal quarter, 1 to 4.", required=True),
            Param("limit", "integer", "Speaker turns to return (default 50, max 200)."),
            Param("offset", "integer", "Speaker turns to skip, to read past the first page."),
        ),
    ),
    ToolSpec(
        "get_insider_transactions",
        "/v1/stocks/{ticker}/insider-transactions",
        "Insider purchases, sales, awards and other transactions in a stock from SEC Forms 4 and 5, newest first.",
        (
            _TICKER,
            _START,
            _END,
            Param(
                "transactionType",
                "string",
                "Optional: Buy, Sell, Award, Conversion, Exercise, TaxPayment, Expiration, Gift, Inheritance, "
                "Discretionary or Other.",
            ),
            Param("insiderName", "string", "Only insiders whose filed name contains every given word."),
            _LIMIT,
        ),
    ),
    ToolSpec(
        "get_institutional_holders",
        "/v1/stocks/{ticker}/institutional-holders",
        "The largest institutional holders of a stock or ETF from 13F filings, ranked by reported quantity.",
        (
            Param("ticker", "string", "Listed security ticker (e.g. AAPL or VOO).", required=True),
            Param("reportDate", "string", "13F report date (yyyy-MM-dd); defaults to the latest available."),
            _LIMIT,
            _OFFSET,
        ),
    ),
    ToolSpec(
        "get_short_interest",
        "/v1/stocks/{ticker}/short-interest",
        "FINRA short interest for a stock or ETF, twice a month, newest first, with days to cover.",
        (
            Param("ticker", "string", "Listed security ticker (e.g. AAPL or VOO).", required=True),
            Param("startDate", "string", "Start settlement date (yyyy-MM-dd, defaults to one year ago)."),
            Param("endDate", "string", "End settlement date (yyyy-MM-dd, defaults to today)."),
            _LIMIT,
        ),
    ),
    ToolSpec(
        "get_guidance",
        "/v1/stocks/{ticker}/guidance",
        "A company's earnings guidance from its 8-K results releases and earnings calls: each guided metric "
        "with its range, basis, period and the verbatim disclosure.",
        (
            _TICKER,
            Param("maxReleases", "integer", "Only the newest N releases."),
            Param("fiscalYear", "integer", "Only guidance for a period in this fiscal year."),
        ),
    ),
    ToolSpec(
        "get_analyst_estimates",
        "/v1/stocks/{ticker}/analyst-estimates",
        "Verified analyst consensus for a company, including segment and operating forecasts, "
        "with original units and publication dates.",
        (
            _TICKER,
            Param("metric", "string", "Exact source metric label to keep."),
            Param("period", "string", "Exact source period label to keep."),
            Param("limit", "integer", "Observations to return (default 100, max 100)."),
        ),
    ),
)
