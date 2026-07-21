"""Single construction point for every Claude client in the app.

Arthvion can talk to Claude through three surfaces, selected by `LLM_PROVIDER`:

| provider         | client                        | model id shape                     |
|------------------|-------------------------------|------------------------------------|
| `anthropic`      | `AsyncAnthropic`              | `claude-opus-4-8`                  |
| `bedrock`        | `AsyncAnthropicBedrock`       | `us.anthropic.claude-sonnet-4-6`   |
| `bedrock-mantle` | `AsyncAnthropicBedrockMantle` | `anthropic.claude-opus-4-8`        |

All three expose the same `.messages.create(...)` surface, so nothing past
construction changes — agents keep their tool loops, hooks, and JSON parsing.

`bedrock` is the older InvokeModel path and needs a **cross-region inference
profile** id (the `us.` prefix); a bare `anthropic.claude-…` id returns
"Invocation of model ID … with on-demand throughput isn't supported".
`bedrock-mantle` is the newer Messages endpoint and wants the un-prefixed
`anthropic.claude-…` form instead. `backend/core/config.py` keeps the right
ids per provider, so callers just read `settings.specialist_model`.

Bedrock credentials come from the standard AWS chain (env vars → `AWS_PROFILE`
→ shared profile → instance role); no key is passed through settings.
"""
from __future__ import annotations

import anthropic

from backend.core.config import get_settings

AnthropicClient = (
    anthropic.AsyncAnthropic
    | anthropic.AsyncAnthropicBedrock
    | anthropic.AsyncAnthropicBedrockMantle
)


def make_client(*, max_retries: int | None = None) -> AnthropicClient:
    """Build the async Claude client for the configured provider.

    `max_retries` overrides `settings.anthropic_max_retries` for callers that
    would rather fail fast than sit in a backoff spiral.
    """
    settings = get_settings()
    common = {
        "max_retries": settings.anthropic_max_retries if max_retries is None else max_retries,
        "timeout": settings.anthropic_request_timeout,
    }

    if settings.llm_provider == "anthropic":
        return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, **common)

    aws = {"aws_region": settings.aws_region}
    if settings.aws_profile:
        aws["aws_profile"] = settings.aws_profile

    if settings.llm_provider == "bedrock-mantle":
        return anthropic.AsyncAnthropicBedrockMantle(**aws, **common)
    return anthropic.AsyncAnthropicBedrock(**aws, **common)


def on_bedrock() -> bool:
    """True when calls are routed through Amazon Bedrock (either variant)."""
    return get_settings().llm_provider.startswith("bedrock")
