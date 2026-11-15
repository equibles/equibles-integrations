"""Strands Agents tools for the Equibles financial data API."""

from __future__ import annotations

import json
from typing import Any, Optional

from strands.tools.tools import PythonAgentTool
from strands.types.tools import ToolResult, ToolUse

from strands_equibles._client import DEFAULT_BASE_URL, EquiblesAPIError, EquiblesClient
from strands_equibles._spec import TOOLS, ToolSpec


def _tool_spec(spec: ToolSpec) -> dict[str, Any]:
    return {
        "name": spec.name,
        "description": spec.description,
        "inputSchema": {
            "json": {
                "type": "object",
                "properties": {p.name: {"type": p.type, "description": p.description} for p in spec.params},
                "required": [p.name for p in spec.params if p.required],
            }
        },
    }


def _make_tool(spec: ToolSpec, client: EquiblesClient) -> PythonAgentTool:
    known = {p.name for p in spec.params}
    required = [p.name for p in spec.params if p.required]

    def run(tool_use: ToolUse, **_: Any) -> ToolResult:
        tool_use_id = tool_use["toolUseId"]
        arguments = {k: v for k, v in (tool_use.get("input") or {}).items() if k in known}
        missing = [name for name in required if arguments.get(name) is None]
        if missing:
            return _result(tool_use_id, "error", f"Missing required argument(s): {', '.join(missing)}.")
        try:
            data = client.call(spec, arguments)
        except EquiblesAPIError as error:
            return _result(tool_use_id, "error", error.message)
        return _result(tool_use_id, "success", json.dumps(data, ensure_ascii=False))

    return PythonAgentTool(spec.name, _tool_spec(spec), run)


def _result(tool_use_id: str, status: str, text: str) -> ToolResult:
    return {"toolUseId": tool_use_id, "status": status, "content": [{"text": text}]}


def equibles_tools(api_key: Optional[str] = None, base_url: str = DEFAULT_BASE_URL) -> list[PythonAgentTool]:
    """All Equibles tools sharing one API client, for ``Agent(tools=equibles_tools())``.

    The key comes from ``api_key`` or the ``EQUIBLES_API_KEY`` environment variable.
    """
    client = EquiblesClient(api_key=api_key, base_url=base_url)
    return [_make_tool(spec, client) for spec in TOOLS]


def equibles_tool(name: str, api_key: Optional[str] = None, base_url: str = DEFAULT_BASE_URL) -> PythonAgentTool:
    """One tool by name, e.g. ``equibles_tool("search_company_filings")``."""
    spec = next((s for s in TOOLS if s.name == name), None)
    if spec is None:
        raise ValueError(f"Unknown Equibles tool {name!r}; choose one of {[s.name for s in TOOLS]}.")
    return _make_tool(spec, EquiblesClient(api_key=api_key, base_url=base_url))
