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


def roll_cache_breakpoint(messages: list[dict]) -> None:
    """Move the rolling cache breakpoint to the end of the conversation.

    Caching a prefix only helps if the breakpoint sits *after* the part that
    repeats. `cached_system()` covers tools + system, but in an agentic loop
    those are the small half — the transcript is what grows, and MCP tool
    results run to 12,000 chars each. Without a breakpoint at the tail, every
    iteration re-uploads the whole transcript at full price.

    Marks the last content block of the last message, so the next request
    reads tools + system + every prior turn from cache.

    Two markers are kept, not one. The API allows 4 breakpoints per request
    (system uses one) and a breakpoint only looks back 20 content blocks to
    find a prior cache entry — so if a single turn adds more than 20 blocks,
    a lone marker would miss and silently fall back to full price. Keeping the
    previous marker leaves a second read point within range.

    Mutates in place. Assistant turns hold SDK block objects rather than dicts,
    so only dict blocks (our tool results) are ever marked.
    """
    marked: list[dict] = []
    for msg in messages:
        content = msg.get("content")
        if not isinstance(content, list):
            continue
        for block in content:
            if isinstance(block, dict) and "cache_control" in block:
                marked.append(block)

    # Keep only the most recent existing marker; the new one below joins it.
    for block in marked[:-1]:
        block.pop("cache_control", None)

    if not messages:
        return
    last = messages[-1].get("content")
    if isinstance(last, list) and last and isinstance(last[-1], dict):
        last[-1]["cache_control"] = {"type": "ephemeral"}


def prompt_cache_headers() -> dict[str, str]:
    """Extra headers to send alongside a `cached_system(...)` prompt.

    Prompt caching is GA on both surfaces, but Bedrock does not take the
    Anthropic beta header — the `cache_control` block on the system prompt is
    enough there, so send nothing extra.
    """
    return {} if on_bedrock() else {"anthropic-beta": "prompt-caching-2024-07-31"}
