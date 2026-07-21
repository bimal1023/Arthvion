"""
Prompt caching helpers for Anthropic API calls.

Marking the system prompt with cache_control=ephemeral tells Anthropic to
cache it for 5 minutes. Within a single agent run (10-14 API calls), all
calls after the first reuse the cached prompt — saving ~90% of system-prompt
token costs.

Minimum cacheable size: 1024 tokens (Sonnet/Opus), 2048 tokens (Haiku).
The system prompts + tool schemas in every agent exceed these thresholds.
"""
from __future__ import annotations

from backend.core.llm import on_bedrock


def cached_system(prompt: str) -> list[dict]:
    """Wrap a system prompt string for Anthropic prompt caching."""
    return [{"type": "text", "text": prompt, "cache_control": {"type": "ephemeral"}}]


def prompt_cache_headers() -> dict[str, str]:
    """Extra headers to send alongside a `cached_system(...)` prompt.

    Prompt caching is GA on both surfaces, but Bedrock does not take the
    Anthropic beta header — the `cache_control` block on the system prompt is
    enough there, so send nothing extra.
    """
    return {} if on_bedrock() else {"anthropic-beta": "prompt-caching-2024-07-31"}
