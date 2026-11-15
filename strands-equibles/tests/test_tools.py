import asyncio
import json

import httpx
import pytest
from strands.tools.registry import ToolRegistry

from strands_equibles._client import EquiblesClient
from strands_equibles._spec import TOOLS
from strands_equibles.tools import _make_tool, equibles_tools


def _client(handler) -> EquiblesClient:
    return EquiblesClient(api_key="eq_test", transport=httpx.MockTransport(handler))


def _tool(name, handler):
    return _make_tool(next(s for s in TOOLS if s.name == name), _client(handler))


def run(tool, arguments: dict) -> dict:
    async def last_event():
        event = None
        async for event in tool.stream({"toolUseId": "t1", "name": tool.tool_name, "input": arguments}, {}):
            pass
        return event.tool_result

    return asyncio.run(last_event())


def test_path_params_fill_the_path_and_the_rest_become_the_query():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["path"] = request.url.path
        seen["query"] = dict(request.url.params)
        return httpx.Response(200, json={"data": [{"turn": 1}]})

    result = run(
        _tool("get_earnings_call_transcript", handler),
        {"ticker": "XLIS:NOS", "fiscalYear": 2025, "fiscalQuarter": 3, "limit": 20, "unknown": "x"},
    )

    assert seen == {"path": "/v1/stocks/XLIS:NOS/earnings-calls/2025/3/speakers", "query": {"limit": "20"}}
    assert result["status"] == "success"
    assert result["toolUseId"] == "t1"
    assert json.loads(result["content"][0]["text"]) == {"data": [{"turn": 1}]}


def test_api_error_becomes_an_error_result_with_the_api_message():
    def handler(request):
        return httpx.Response(404, json={"error": {"code": "not_found", "message": "Stock 'ZZZ' not found.", "status": 404}})

    result = run(_tool("get_stock_profile", handler), {"ticker": "ZZZ"})

    assert result["status"] == "error"
    assert result["content"][0]["text"] == "Stock 'ZZZ' not found."


def test_missing_required_argument_is_refused_without_calling_the_api():
    def handler(request):
        raise AssertionError("the API must not be called")

    result = run(_tool("search_company_filings", handler), {"ticker": "AAPL"})

    assert result["status"] == "error"
    assert "query" in result["content"][0]["text"]


def test_strands_accepts_every_tool_spec(monkeypatch):
    monkeypatch.setenv("EQUIBLES_API_KEY", "eq_env")
    registry = ToolRegistry()

    names = registry.process_tools(equibles_tools())

    assert sorted(names) == sorted(s.name for s in TOOLS)


def test_a_key_is_required(monkeypatch):
    monkeypatch.delenv("EQUIBLES_API_KEY", raising=False)
    with pytest.raises(ValueError, match="EQUIBLES_API_KEY"):
        equibles_tools()


def test_a_dot_segment_path_value_is_refused_without_calling_the_api():
    def handler(request):
        raise AssertionError("the API must not be called")

    result = run(_tool("search_company_filings", handler), {"ticker": "..", "query": "buyback"})

    assert result["status"] == "error"
    assert result["content"][0]["text"] == "Invalid value for ticker."


def test_an_unreachable_api_gives_a_readable_error_result():
    def handler(request):
        raise httpx.ConnectError(f"failed sending {request.headers['Authorization']}")

    result = run(_tool("get_stock_profile", handler), {"ticker": "NVDA"})

    assert result["status"] == "error"
    assert result["content"][0]["text"] == "Could not reach the Equibles API (ConnectError)."


def test_a_key_pasted_with_a_trailing_newline_still_works():
    seen = {}

    def handler(request):
        seen["auth"] = request.headers["Authorization"]
        return httpx.Response(200, json={})

    client = EquiblesClient(api_key="eq_test\n", transport=httpx.MockTransport(handler))
    run(_make_tool(next(s for s in TOOLS if s.name == "get_stock_profile"), client), {"ticker": "NVDA"})

    assert seen["auth"] == "Bearer eq_test"


def test_a_key_with_an_inner_space_is_refused_with_a_message_that_does_not_quote_it():
    with pytest.raises(ValueError) as error:
        EquiblesClient(api_key="eq_te st")

    assert str(error.value) == "The Equibles API key contains a space or control character; copy it again."
