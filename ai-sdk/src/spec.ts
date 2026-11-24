// The Equibles REST endpoints these tools wrap, one entry per tool, kept in step with the
// Python packages' specs. Every path and parameter must exist in
// https://api.equibles.com/openapi/v1.json; the live test checks this against the live document.

export interface ParamSpec {
  name: string;
  type: 'string' | 'integer' | 'boolean';
  description: string;
  required?: boolean;
}

export interface ToolSpec {
  name: string;
  path: string;
  description: string;
  params: readonly ParamSpec[];
}

export const TOOL_SPECS = [
  {
    name: "searchListings",
    path: "/v1/listings",
    description:
      "Find stock listings by company name or ticker, or by ISIN, across US and other exchanges. Returns the symbol the other Equibles tools accept: a bare ticker for a US listing, MIC:TICKER elsewhere.",
    params: [
      { name: "query", type: "string", description: "Company name or ticker to search for (e.g. siemens, ASML or XETR:SIE)." },
      { name: "isin", type: "string", description: "ISIN to look up (e.g. IE00B5BMR087); cannot be combined with query." },
      { name: "limit", type: "integer", description: "Maximum rows to return." },
    ],
  },
  {
    name: "getStockProfile",
    path: "/v1/stocks/{ticker}",
    description:
      "A listing's profile: company description, website, sector and industry, CIK, fiscal year end, ISIN and the company's other listings.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
    ],
  },
  {
    name: "getStockPrices",
    path: "/v1/stocks/{ticker}/prices",
    description:
      "Daily open, high, low, close and volume history for a stock, newest first, in the listing's trading currency.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "startDate", type: "string", description: "Start date (yyyy-MM-dd, defaults to one year ago)." },
      { name: "endDate", type: "string", description: "End date (yyyy-MM-dd, defaults to today)." },
      { name: "interval", type: "string", description: "daily (default), weekly or monthly." },
      { name: "limit", type: "integer", description: "Maximum rows to return." },
    ],
  },
  {
    name: "getFinancialStatement",
    path: "/v1/stocks/{ticker}/financial-statements/{statement}",
    description:
      "A company's income statement, balance sheet or cash-flow statement for one fiscal period, from its SEC XBRL filings, with the latest restatement of each line.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "statement", type: "string", description: "income, balance or cashflow.", required: true },
      { name: "year", type: "integer", description: "Fiscal year; omit with period for the latest available period." },
      { name: "period", type: "string", description: "Fiscal period: FY or Q1 through Q4." },
    ],
  },
  {
    name: "searchCompanyFilings",
    path: "/v1/stocks/{ticker}/filings/search",
    description:
      "Search one company's SEC filings and earnings call transcripts. Returns matching excerpts with their document ids and line numbers, which readFilingLines can expand.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "query", type: "string", description: "Plain keywords or a short phrase, worded the way a filing would say it (e.g. 'Data Center revenue').", required: true },
      { name: "documentType", type: "string", description: "Optional document type filter, one value or a comma-separated list by form label (e.g. 10-K,10-Q)." },
      { name: "startDate", type: "string", description: "Earliest date to include (yyyy-MM-dd)." },
      { name: "endDate", type: "string", description: "Latest date to include (yyyy-MM-dd)." },
      { name: "limit", type: "integer", description: "Maximum excerpts to return (default 5)." },
    ],
  },
  {
    name: "searchAllFilings",
    path: "/v1/filings/search",
    description:
      "Search every company's SEC filings and earnings call transcripts at once, for questions like which companies mention a topic. Returns excerpts with their tickers and document ids.",
    params: [
      { name: "query", type: "string", description: "Plain keywords or a short phrase, worded the way a filing would say it (e.g. 'Data Center revenue').", required: true },
      { name: "documentType", type: "string", description: "Optional document type filter, one value or a comma-separated list by form label (e.g. 10-K,10-Q)." },
      { name: "startDate", type: "string", description: "Earliest date to include (yyyy-MM-dd)." },
      { name: "endDate", type: "string", description: "Latest date to include (yyyy-MM-dd)." },
      { name: "limit", type: "integer", description: "Maximum excerpts to return (default 5)." },
      { name: "maxResultsPerCompany", type: "integer", description: "Cap excerpts per company to spread results across more companies." },
    ],
  },
  {
    name: "readFilingLines",
    path: "/v1/filings/{documentId}/lines",
    description:
      "Read a range of numbered text lines from one filing or transcript, by the document id a search returned.",
    params: [
      { name: "documentId", type: "string", description: "Document id from a filing search or list.", required: true },
      { name: "startLine", type: "integer", description: "First line to read (1-based).", required: true },
      { name: "endLine", type: "integer", description: "Last line to read; at most 500 lines come back per call.", required: true },
    ],
  },
  {
    name: "listInvestorEvents",
    path: "/v1/stocks/{ticker}/investor-events",
    description:
      "A company's investor events, newest first, including scheduled ones: earnings calls with their fiscal year, quarter and whether a transcript exists, plus conferences, investor days and shareholder meetings.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "eventType", type: "string", description: "Optional: EarningsCall, CapitalMarketsDay, InvestorUpdate, AGM, Conference, FiresideChat or MAndA." },
      { name: "limit", type: "integer", description: "Maximum rows to return." },
    ],
  },
  {
    name: "getEarningsCallTranscript",
    path: "/v1/stocks/{ticker}/earnings-calls/{fiscalYear}/{fiscalQuarter}/speakers",
    description:
      "The speaker-labelled transcript of a fiscal quarter's earnings call, turn by turn. Long calls page with offset; the response says whether more turns follow.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "fiscalYear", type: "integer", description: "Fiscal year the quarter belongs to (e.g. 2025).", required: true },
      { name: "fiscalQuarter", type: "integer", description: "Fiscal quarter, 1 to 4.", required: true },
      { name: "limit", type: "integer", description: "Speaker turns to return (default 50, max 200)." },
      { name: "offset", type: "integer", description: "Speaker turns to skip, to read past the first page." },
    ],
  },
  {
    name: "getInsiderTransactions",
    path: "/v1/stocks/{ticker}/insider-transactions",
    description:
      "Insider purchases, sales, awards and other transactions in a stock from SEC Forms 4 and 5, newest first.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "startDate", type: "string", description: "Earliest date to include (yyyy-MM-dd)." },
      { name: "endDate", type: "string", description: "Latest date to include (yyyy-MM-dd)." },
      { name: "transactionType", type: "string", description: "Optional: Buy, Sell, Award, Conversion, Exercise, TaxPayment, Expiration, Gift, Inheritance, Discretionary or Other." },
      { name: "insiderName", type: "string", description: "Only insiders whose filed name contains every given word." },
      { name: "limit", type: "integer", description: "Maximum rows to return." },
    ],
  },
  {
    name: "getInstitutionalHolders",
    path: "/v1/stocks/{ticker}/institutional-holders",
    description:
      "The largest institutional holders of a stock or ETF from 13F filings, ranked by reported quantity.",
    params: [
      { name: "ticker", type: "string", description: "Listed security ticker (e.g. AAPL or VOO).", required: true },
      { name: "reportDate", type: "string", description: "13F report date (yyyy-MM-dd); defaults to the latest available." },
      { name: "limit", type: "integer", description: "Maximum rows to return." },
      { name: "offset", type: "integer", description: "Rows to skip before the first returned row (default 0)." },
    ],
  },
  {
    name: "getShortInterest",
    path: "/v1/stocks/{ticker}/short-interest",
    description:
      "FINRA short interest for a stock or ETF, twice a month, newest first, with days to cover.",
    params: [
      { name: "ticker", type: "string", description: "Listed security ticker (e.g. AAPL or VOO).", required: true },
      { name: "startDate", type: "string", description: "Start settlement date (yyyy-MM-dd, defaults to one year ago)." },
      { name: "endDate", type: "string", description: "End settlement date (yyyy-MM-dd, defaults to today)." },
      { name: "limit", type: "integer", description: "Maximum rows to return." },
    ],
  },
  {
    name: "getGuidance",
    path: "/v1/stocks/{ticker}/guidance",
    description:
      "A company's earnings guidance from its 8-K results releases and earnings calls: each guided metric with its range, basis, period and the verbatim disclosure.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "maxReleases", type: "integer", description: "Only the newest N releases." },
      { name: "fiscalYear", type: "integer", description: "Only guidance for a period in this fiscal year." },
    ],
  },
  {
    name: "getAnalystEstimates",
    path: "/v1/stocks/{ticker}/analyst-estimates",
    description:
      "Verified analyst consensus for a company, including segment and operating forecasts, with original units and publication dates.",
    params: [
      { name: "ticker", type: "string", description: "Exact listed ticker (e.g. AAPL or BRK-B), or MIC:TICKER for a listing on another exchange (e.g. XETR:SIE).", required: true },
      { name: "metric", type: "string", description: "Exact source metric label to keep." },
      { name: "period", type: "string", description: "Exact source period label to keep." },
      { name: "limit", type: "integer", description: "Observations to return (default 100, max 100)." },
    ],
  },
] as const satisfies readonly ToolSpec[];

export type EquiblesToolName = (typeof TOOL_SPECS)[number]['name'];
