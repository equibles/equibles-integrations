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
    """A failed call: the API's own error message, or status 0 when the API could not be reached."""

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
        key = (api_key or os.environ.get(API_KEY_ENV) or "").strip()
        if not key:
            raise ValueError(
                f"An Equibles API key is required: pass api_key or set {API_KEY_ENV}. "
                "Get a free key at https://equibles.com/dashboard/apikeys."
            )
        # A bad header value makes httpx raise an error that quotes the header, key included.
        if any(c.isspace() or not c.isprintable() or not c.isascii() for c in key):
            raise ValueError("The Equibles API key contains a space, control or non-ASCII character; copy it again.")
        self._http = httpx.Client(
            base_url=base_url,
            timeout=timeout,
            transport=transport,
            headers={"Authorization": f"Bearer {key}", "User-Agent": "strands-equibles"},
        )

    def call(self, spec: ToolSpec, arguments: dict[str, Any]) -> Any:
        path = spec.path
        for name in spec.path_params:
            value = arguments.get(name)
            if value is None:
                raise EquiblesAPIError(400, f"Missing required argument {name}.")
            # Dot segments survive quoting and httpx resolves them, moving the request to another route.
            if str(value).strip() in ("", ".", ".."):
                raise EquiblesAPIError(400, f"Invalid value for {name}.")
            # Keep ":" for MIC:TICKER but encode "/", so a value always stays one path segment.
            path = path.replace("{" + name + "}", quote(str(value), safe=":"))
        query = {
            k: _query_value(v)
            for k, v in arguments.items()
            if v is not None and k not in spec.path_params
        }
        try:
            response = self._http.get(path, params=query)
        except (httpx.HTTPError, httpx.InvalidURL) as error:
            # The exception text can quote request headers, so only its type is passed on.
            raise EquiblesAPIError(0, f"Could not reach the Equibles API ({type(error).__name__}).") from None
        if not response.is_success:
            raise _error_from(response)
        try:
            return response.json()
        except ValueError:
            raise EquiblesAPIError(response.status_code, "The Equibles API returned a non-JSON answer.") from None

    def close(self) -> None:
        self._http.close()


def _query_value(value: Any) -> Any:
    # httpx renders booleans as "True"/"False"; the API binds lowercase.
    return str(value).lower() if isinstance(value, bool) else value


def _error_from(response: httpx.Response) -> EquiblesAPIError:
    try:
        body = response.json()
    except ValueError:
        body = None
    error = body.get("error") if isinstance(body, dict) else None
    if isinstance(error, dict) and error.get("message"):
        return EquiblesAPIError(response.status_code, str(error["message"]), error.get("code"))
    return EquiblesAPIError(response.status_code, response.text[:500])
