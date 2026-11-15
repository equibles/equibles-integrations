"""Live checks against api.equibles.com; run with `pytest -m live`."""

import json
import os

import httpx
import pytest

from langchain_equibles._spec import TOOLS
from langchain_equibles.tools import EquiblesToolkit

pytestmark = pytest.mark.live

OPENAPI_URL = "https://api.equibles.com/openapi/v1.json"


@pytest.fixture(scope="module")
def openapi() -> dict:
    return httpx.get(OPENAPI_URL, timeout=60).json()


@pytest.mark.parametrize("spec", TOOLS, ids=lambda s: s.name)
def test_every_wrapped_path_and_param_exists_in_the_live_openapi(openapi, spec):
    operation = openapi["paths"].get(spec.path, {}).get("get")
    assert operation is not None, f"{spec.path} is not a GET route in the API"
    declared = {p["name"]: p["in"] for p in operation.get("parameters", [])}
    for param in spec.params:
        expected_in = "path" if param.name in spec.path_params else "query"
        assert declared.get(param.name) == expected_in, f"{spec.name}.{param.name} is not a {expected_in} parameter"


# One real call per tool, chained where an argument comes from another tool's answer.
EXAMPLES = {
    "search_listings": {"query": "nvidia", "limit": 3},
    "get_stock_profile": {"ticker": "NVDA"},
    "get_stock_prices": {"ticker": "NVDA", "limit": 5},
    "get_financial_statement": {"ticker": "NVDA", "statement": "income"},
    "search_company_filings": {"ticker": "NVDA", "query": "Data Center revenue", "limit": 2},
    "search_all_filings": {"query": "share repurchase program", "limit": 2, "maxResultsPerCompany": 1},
    "list_investor_events": {"ticker": "NVDA", "eventType": "EarningsCall", "limit": 2},
    "get_insider_transactions": {"ticker": "NVDA", "limit": 3},
    "get_institutional_holders": {"ticker": "NVDA", "limit": 3},
    "get_short_interest": {"ticker": "NVDA", "limit": 2},
    "get_guidance": {"ticker": "NVDA", "maxReleases": 1},
    "get_analyst_estimates": {"ticker": "NVDA", "limit": 5},
}


@pytest.fixture(scope="module")
def tools() -> dict:
    if not os.environ.get("EQUIBLES_API_KEY"):
        pytest.skip("EQUIBLES_API_KEY is not set")
    return {t.name: t for t in EquiblesToolkit().get_tools()}


def _call(tools, name, args):
    answer = tools[name].invoke(args)
    try:
        return json.loads(answer)
    except json.JSONDecodeError:
        pytest.fail(f"{name} answered an error: {answer}")


@pytest.mark.parametrize("name", sorted(EXAMPLES))
def test_each_tool_answers_json(tools, name):
    assert _call(tools, name, EXAMPLES[name])


def test_transcript_and_lines_from_ids_other_tools_return(tools):
    events = _call(tools, "list_investor_events", EXAMPLES["list_investor_events"])
    call = next(e for e in events["data"] if e.get("hasTranscript"))
    transcript = _call(
        tools,
        "get_earnings_call_transcript",
        {"ticker": "NVDA", "fiscalYear": call["fiscalYear"], "fiscalQuarter": call["fiscalQuarter"], "limit": 2},
    )
    assert transcript["data"]

    hits = _call(tools, "search_company_filings", EXAMPLES["search_company_filings"])
    document_id = hits["data"][0]["documentId"]
    lines = _call(tools, "read_filing_lines", {"documentId": document_id, "startLine": 1, "endLine": 5})
    assert lines
