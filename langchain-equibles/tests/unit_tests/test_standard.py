from langchain_tests.unit_tests import ToolsUnitTests

from langchain_equibles._client import EquiblesClient
from langchain_equibles._spec import TOOLS
from langchain_equibles.tools import EquiblesTool


class TestEquiblesToolUnit(ToolsUnitTests):
    @property
    def tool_constructor(self):
        return EquiblesTool

    @property
    def tool_constructor_params(self) -> dict:
        return {
            "spec": next(s for s in TOOLS if s.name == "search_company_filings"),
            "client": EquiblesClient(api_key="eq_test"),
        }

    @property
    def tool_invoke_params_example(self) -> dict:
        return {"ticker": "NVDA", "query": "Data Center revenue", "limit": 3}
