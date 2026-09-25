"""A cost the generation API itself reported (OpenRouter's ``usage.cost``, or the same field a
billing gateway stamps with its rate-card price) is the billed figure: it lands in the actual
column and the call's own estimate is suppressed, so actual and estimate never double-count —
in the in-memory rollups the usage payload reports and in the state.db write alike."""
from types import SimpleNamespace


def _agent(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    from hermes_state import SessionDB
    from run_agent import AIAgent
    return AIAgent(api_key="k", base_url="https://inference-api.nousresearch.com/v1", provider="nous",
                   api_mode="chat_completions", model="anthropic/claude-fable-5.1", session_id="t", platform="cli",
                   quiet_mode=True, skip_context_files=True, skip_memory=True, save_trajectories=False,
                   enabled_toolsets=["file"], session_db=SessionDB(db_path=tmp_path / "usage.db"))


def _usage(cost=None):
    u = {"prompt_tokens": 1200, "completion_tokens": 60, "total_tokens": 1260}
    if cost is not None:
        u["cost"] = cost
    return u


def _record(agent, resp):
    from agent import turn_usage
    captured = {}
    # The session db is created lazily; make the row exist so the accounting path runs,
    # then capture the enqueued write (the SQL semantics live in hermes_state tests).
    agent._ensure_db_session()
    db = agent._session_db
    real = db.queue_token_counts

    def capture(session_id, **kwargs):
        captured.update(kwargs)

    db.queue_token_counts = capture
    try:
        turn_usage.record_response_usage(agent, resp, messages=[{"role": "user", "content": "hi"}],
                                         api_call_count=1, api_duration=0.2, compression_attempts=0,
                                         max_compression_attempts=3)
    finally:
        db.queue_token_counts = real
    return captured


def test_reported_cost_wins_and_the_calls_estimate_is_suppressed(tmp_path, monkeypatch):
    a = _agent(tmp_path, monkeypatch)
    try:
        captured = _record(a, SimpleNamespace(usage=_usage(cost=0.0046), id=None, model="anthropic/claude-fable-5.1"))
        assert a.session_actual_cost_usd == 0.0046
        assert a.session_estimated_cost_usd == 0.0
        assert a.session_cost_status == "actual"
        assert a.session_cost_source == "provider_generation_api"
        assert captured["actual_cost_usd"] == 0.0046
        assert captured["estimated_cost_usd"] is None
        assert captured["cost_status"] == "actual"
        assert captured["cost_source"] == "provider_generation_api"
    finally:
        a.close()


def test_without_a_reported_cost_nothing_lands_in_the_actual_column(tmp_path, monkeypatch):
    a = _agent(tmp_path, monkeypatch)
    try:
        captured = _record(a, SimpleNamespace(usage=_usage(), id=None, model="anthropic/claude-fable-5.1"))
        assert a.session_actual_cost_usd == 0.0
        assert captured["actual_cost_usd"] is None
        # The estimate path is untouched: status/source still come from the pricing result.
        assert captured["cost_status"] == a.session_cost_status
        assert captured["cost_source"] == a.session_cost_source
    finally:
        a.close()