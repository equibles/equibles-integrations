"""Minimal HTTP client for the Equibles REST API."""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote

import httpx

from strands_equibles._spec import ToolSpec

DEFAULT_BASE_URL = "https://api.equibles.com"
API_KEY_ENV = "EQUIBLES_API_KEY"


class EquiblesAPIError(Exception):
    """A non-2xx answer from the API, carrying the API's own error message."""

    def __init__(self, status: int, message: str, code: str | None = None) -> None:
        super().__init__(f"Equibles API error {status}: {message}")
        self.status = status
        self.code = code
        self.message = message


class EquiblesClient:
    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 60.0,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        key = api_key or os.environ.get(API_KEY_ENV)
        if not key:
            raise ValueError(
                f"An Equibles API key is required: pass api_key or set {API_KEY_ENV}. "
                "Get a free key at https://equibles.com/dashboard/apikeys."
            )
        self._http = httpx.Client(
            base_url=base_url,
            timeout=timeout,
            transport=transport,
            headers={"Authorization": f"Bearer {key}", "User-Agent": "strands-equibles"},
        )

    def call(self, spec: ToolSpec, arguments: dict[str, Any]) -> Any:
        path = spec.path
        for name in spec.path_params:
            # Keep ":" for MIC:TICKER but encode "/", so a value always stays one path segment.
            path = path.replace("{" + name + "}", quote(str(arguments[name]), safe=":"))
        query = {
            k: _query_value(v)
            for k, v in arguments.items()
            if v is not None and k not in spec.path_params
        }
        response = self._http.get(path, params=query)
        if response.is_success:
            return response.json()
        raise _error_from(response)

    def close(self) -> None:
        self._http.close()


def _query_value(value: Any) -> Any:
    # httpx renders booleans as "True"/"False"; the API binds lowercase.
    return str(value).lower() if isinstance(value, bool) else value


def _error_from(response: httpx.Response) -> EquiblesAPIError:
    try:
        error = response.json().get("error", {})
        return EquiblesAPIError(response.status_code, error.get("message") or response.text, error.get("code"))
    except ValueError:
        return EquiblesAPIError(response.status_code, response.text[:500])
