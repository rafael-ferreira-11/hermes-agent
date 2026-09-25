"""``_get_usage`` reports session spend on the already-declared wire fields: the sum of
gateway/provider-reported actuals and our own estimates (disjoint call sets), with the
status telling the client which kind it is."""
from types import SimpleNamespace


def _agent(**costs):
    return SimpleNamespace(
        model="m",
        session_input_tokens=10, session_output_tokens=5, session_prompt_tokens=10,
        session_completion_tokens=5, session_total_tokens=15, session_reasoning_tokens=0,
        session_api_calls=1, context_compressor=None, **costs,
    )


def test_cost_sums_actual_and_estimate_and_the_status_names_the_actual():
    from tui_gateway.server import _get_usage
    usage = _get_usage(_agent(session_actual_cost_usd=0.01, session_estimated_cost_usd=0.002,
                              session_cost_status="estimated"))
    assert usage["cost_usd"] == 0.012
    assert usage["cost_status"] == "actual"


def test_estimate_only_sessions_carry_their_own_status():
    from tui_gateway.server import _get_usage
    usage = _get_usage(_agent(session_actual_cost_usd=0.0, session_estimated_cost_usd=0.05,
                              session_cost_status="estimated"))
    assert usage["cost_usd"] == 0.05
    assert usage["cost_status"] == "estimated"


def test_no_spend_reports_no_cost_fields():
    from tui_gateway.server import _get_usage
    usage = _get_usage(_agent(session_actual_cost_usd=0.0, session_estimated_cost_usd=0.0,
                              session_cost_status="unknown"))
    assert "cost_usd" not in usage
    assert "cost_status" not in usage