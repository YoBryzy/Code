"""Sends a screenshot to Claude and streams back the answer."""

from __future__ import annotations

import threading
from typing import Any, Callable

import anthropic

SYSTEM_PROMPT = """\
You are Screen Answer, a desktop assistant. The user sent you screenshot(s) of their screen \
(one image per monitor, or a region they selected). Read everything visible - all text, \
code, diagrams, charts, tables, images and answer options - then find the question(s) or \
problem(s) on screen and answer them.

How to respond:
- Use the whole screen as context: instructions, passages, figures or earlier parts of a \
problem shown elsewhere on screen often matter. Ignore window chrome, menus and ads.
- For each question, start with the answer on its own line as "Answer: ...". For multiple \
choice, give the letter/number and the option text exactly as shown.
- Then give a short explanation (a few sentences, or brief steps for math/code) so the user \
can check the reasoning.
- If there are several questions, number them in the order they appear on screen \
("1. Answer: ...").
- If part of a question is cut off or unreadable, say what is missing and answer what you can.
- If there is no question on screen, briefly describe what you see and ask what they want to know.
- Write plain text only. Do not use Markdown (no **, #, or tables).
"""

# Models that accept the server-side `fallbacks` parameter on the Claude API.
FALLBACK_MODELS = {"claude-fable-5-1", "claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5"}
FALLBACK_BETA = "server-side-fallback-2026-07-01"

MODEL_CHOICES = ("claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1")


class Cancelled(Exception):
    pass


def _echoable_content(content: list[Any]) -> list[dict]:
    """Assistant content to send back on the next turn.

    After a mid-output fallback, model-internal blocks that came before the last
    `fallback` marker must not be echoed; the marker itself is only an audit record.
    """
    blocks = [b.model_dump(exclude_none=True) for b in content]
    last_fallback = max((i for i, b in enumerate(blocks) if b["type"] == "fallback"), default=-1)
    internal = {"thinking", "redacted_thinking", "tool_use"}
    return [
        b
        for i, b in enumerate(blocks)
        if b["type"] != "fallback" and not (i < last_fallback and b["type"] in internal)
    ]


class Solver:
    """Holds one conversation: a screenshot plus any follow-up questions."""

    def __init__(self, api_key: str, model: str, effort: str, extra_instructions: str = ""):
        self.client = anthropic.Anthropic(api_key=api_key or None)
        self.model = model
        self.effort = effort
        self.system = SYSTEM_PROMPT
        if extra_instructions.strip():
            self.system += "\nAdditional instructions from the user:\n" + extra_instructions.strip()
        self.messages: list[dict] = []
        self._lock = threading.Lock()

    def new_screenshot(self, images: list[tuple[str, str]], note: str = "") -> None:
        """Start a new conversation from one or more (media_type, base64) images."""
        content: list[dict] = []
        for i, (media_type, data_b64) in enumerate(images, start=1):
            if len(images) > 1:
                content.append({"type": "text", "text": f"Monitor {i}:"})
            content.append({"type": "image", "source": {"type": "base64", "media_type": media_type, "data": data_b64}})
        text = "Answer the question(s) on my screen."
        if note.strip():
            text += "\n" + note.strip()
        content.append({"type": "text", "text": text})
        self.messages = [{"role": "user", "content": content}]

    def add_follow_up(self, text: str) -> None:
        if not self.messages:
            raise ValueError("Capture the screen first.")
        self.messages.append({"role": "user", "content": text})

    def run(
        self,
        on_text: Callable[[str], None],
        on_status: Callable[[str], None],
        cancel: threading.Event,
    ) -> str:
        """Stream a reply to the current conversation. Returns the full answer text.

        Raises Cancelled, or a user-facing RuntimeError on API problems.
        """
        with self._lock:
            kwargs: dict[str, Any] = dict(
                model=self.model,
                max_tokens=32000,
                system=self.system,
                messages=self.messages,
                thinking={"type": "adaptive"},
                output_config={"effort": self.effort},
            )
            if self.model in FALLBACK_MODELS:
                kwargs["betas"] = [FALLBACK_BETA]
                kwargs["fallbacks"] = "default"

            on_status("Reading your screen...")
            try:
                with self.client.beta.messages.stream(**kwargs) as stream:
                    for event in stream:
                        if cancel.is_set():
                            raise Cancelled()
                        if event.type == "content_block_start":
                            kind = event.content_block.type
                            if kind == "thinking":
                                on_status("Thinking...")
                            elif kind == "text":
                                on_status("Answering...")
                        elif event.type == "content_block_delta" and event.delta.type == "text_delta":
                            on_text(event.delta.text)
                    final = stream.get_final_message()
            except Cancelled:
                self._drop_unanswered_turn()
                raise
            except anthropic.AuthenticationError:
                self._drop_unanswered_turn()
                raise RuntimeError("Your API key was rejected. Check it in Settings.")
            except anthropic.PermissionDeniedError as e:
                self._drop_unanswered_turn()
                raise RuntimeError(f"This API key can't use {self.model}: {e.message}")
            except anthropic.RateLimitError:
                self._drop_unanswered_turn()
                raise RuntimeError("Rate limited by the API. Wait a moment and try again.")
            except anthropic.BadRequestError as e:
                self._drop_unanswered_turn()
                raise RuntimeError(f"Request rejected: {e.message}")
            except anthropic.APIStatusError as e:
                self._drop_unanswered_turn()
                raise RuntimeError(f"API error {e.status_code}: {e.message}")
            except anthropic.APIConnectionError:
                self._drop_unanswered_turn()
                raise RuntimeError("Couldn't reach the Claude API. Check your internet connection.")

            if final.stop_reason == "refusal":
                self._drop_unanswered_turn()
                raise RuntimeError("Claude declined to answer this one.")

            self.messages.append({"role": "assistant", "content": _echoable_content(final.content)})
            answer = "".join(b.text for b in final.content if b.type == "text")
            if final.stop_reason == "max_tokens":
                on_text("\n\n[Answer was cut off - it hit the length limit.]")
            return answer

    def _drop_unanswered_turn(self) -> None:
        # Keep history valid: a follow-up that got no reply shouldn't linger,
        # but the screenshot turn stays so the user can retry.
        if len(self.messages) > 1 and self.messages[-1]["role"] == "user":
            self.messages.pop()
