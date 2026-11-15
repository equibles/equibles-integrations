import json

import httpx
import pytest
from langchain_core.tools import ToolException

from langchain_equibles._client import EquiblesClient
from langchain_equibles._spec import TOOLS
from langchain_equibles.tools import EquiblesTool, EquiblesToolkit


def _client(handler) -> EquiblesClient:
    return EquiblesClient(api_key="eq_test", transport=httpx.MockTransport(handler))


def _spec(name):
    return next(s for s in TOOLS if s.name == name)


def test_path_params_fill_the_path_and_the_rest_become_the_query():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["query"] = dict(request.url.params)
        seen["auth"] = request.headers["Authorization"]
        return httpx.Response(200, json={"data": [{"turn": 1}]})

    tool = EquiblesTool(_spec("get_earnings_call_transcript"), _client(handler))
    answer = tool.invoke({"ticker": "XLIS:NOS", "fiscalYear": 2025, "fiscalQuarter": 3, "limit": 20})

    assert seen["path"] == "/v1/stocks/XLIS:NOS/earnings-calls/2025/3/speakers"
    assert seen["query"] == {"limit": "20"}
    assert seen["auth"] == "Bearer eq_test"
    assert json.loads(answer) == {"data": [{"turn": 1}]}


def test_omitted_optional_params_are_not_sent():
    seen = {}

    def handler(request):
        seen["query"] = dict(request.url.params)
        return httpx.Response(200, json=[])

    EquiblesTool(_spec("search_company_filings"), _client(handler)).invoke({"ticker": "AAPL", "query": "buyback"})

    assert seen["query"] == {"query": "buyback"}


def test_a_slash_in_a_path_value_cannot_reach_another_route():
    seen = {}

    def handler(request):
        seen["raw_path"] = request.url.raw_path.decode()
        return httpx.Response(200, json={})

    EquiblesTool(_spec("get_stock_profile"), _client(handler)).invoke({"ticker": "AAPL/../filings"})

    assert seen["raw_path"] == "/v1/stocks/AAPL%2F..%2Ffilings"


def test_api_error_message_reaches_the_agent_as_the_tool_answer():
    def handler(request):
        return httpx.Response(404, json={"error": {"code": "not_found", "message": "Stock 'ZZZ' not found.", "status": 404}})

    tool = EquiblesTool(_spec("get_stock_profile"), _client(handler))

    assert tool.invoke({"ticker": "ZZZ"}) == "Stock 'ZZZ' not found."
    tool.handle_tool_error = False
    with pytest.raises(ToolException):
        tool.invoke({"ticker": "ZZZ"})


def test_toolkit_needs_a_key(monkeypatch):
    monkeypatch.delenv("EQUIBLES_API_KEY", raising=False)
    with pytest.raises(ValueError, match="EQUIBLES_API_KEY"):
        EquiblesToolkit()


def test_toolkit_reads_the_key_from_the_environment(monkeypatch):
    monkeypatch.setenv("EQUIBLES_API_KEY", "eq_env")
    tools = EquiblesToolkit().get_tools()

    assert [t.name for t in tools] == [s.name for s in TOOLS]
