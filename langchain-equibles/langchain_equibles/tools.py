"""LangChain tools for the Equibles financial data API."""

from __future__ import annotations

import json
from typing import Any, Optional

from langchain_core.tools import BaseTool, BaseToolkit, ToolException
from pydantic import BaseModel, ConfigDict, Field, PrivateAttr, create_model

from langchain_equibles._client import DEFAULT_BASE_URL, EquiblesAPIError, EquiblesClient
from langchain_equibles._spec import TOOLS, ToolSpec

_PY_TYPES: dict[str, type] = {"string": str, "integer": int, "boolean": bool}


def _args_schema(spec: ToolSpec) -> type[BaseModel]:
    fields: dict[str, Any] = {}
    for p in spec.params:
        py_type = _PY_TYPES[p.type]
        if p.required:
            fields[p.name] = (py_type, Field(description=p.description))
        else:
            fields[p.name] = (Optional[py_type], Field(default=None, description=p.description))
    model_name = "".join(part.title() for part in spec.name.split("_")) + "Input"
    return create_model(model_name, **fields)


class EquiblesTool(BaseTool):
    """One Equibles endpoint as a LangChain tool; the answer is the API's JSON as text."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    handle_tool_error: bool = True
    _spec: ToolSpec = PrivateAttr()
    _client: EquiblesClient = PrivateAttr()

    def __init__(self, spec: ToolSpec, client: EquiblesClient, **kwargs: Any) -> None:
        super().__init__(name=spec.name, description=spec.description, args_schema=_args_schema(spec), **kwargs)
        self._spec = spec
        self._client = client

    def _run(self, *args: Any, run_manager: Any = None, **kwargs: Any) -> str:
        # LangChain passes a plain string input positionally, after validating it as the first field.
        if args:
            kwargs = {self._spec.params[0].name: args[0], **kwargs}
        try:
            data = self._client.call(self._spec, kwargs)
        except EquiblesAPIError as error:
            raise ToolException(error.message) from error
        return json.dumps(data, ensure_ascii=False)


class EquiblesToolkit(BaseToolkit):
    """All Equibles tools sharing one API client.

    The key comes from ``api_key`` or the ``EQUIBLES_API_KEY`` environment variable.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    api_key: Optional[str] = Field(default=None, exclude=True, repr=False)
    base_url: str = DEFAULT_BASE_URL
    _client: EquiblesClient = PrivateAttr()

    def __init__(self, **data: Any) -> None:
        super().__init__(**data)
        self._client = EquiblesClient(api_key=self.api_key, base_url=self.base_url)

    def get_tools(self) -> list[BaseTool]:
        return [EquiblesTool(spec, self._client) for spec in TOOLS]


def get_tool(name: str, api_key: Optional[str] = None, base_url: str = DEFAULT_BASE_URL) -> EquiblesTool:
    """One tool by name, e.g. ``get_tool("search_company_filings")``."""
    spec = next((s for s in TOOLS if s.name == name), None)
    if spec is None:
        raise ValueError(f"Unknown Equibles tool {name!r}; choose one of {[s.name for s in TOOLS]}.")
    return EquiblesTool(spec, EquiblesClient(api_key=api_key, base_url=base_url))
