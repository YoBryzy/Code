import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { extractJson } from "@/lib/utils";

let _client: Anthropic | null = null;

/** Lazily-constructed Anthropic client (so importing this module never throws). */
export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: serverEnv.anthropicApiKey });
  return _client;
}

export class AIValidationError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "AIValidationError";
  }
}

export interface ImageInput {
  /** Public/signed URL to an image Claude can read with vision. */
  url: string;
}

interface GenerateJSONOptions<T extends z.ZodTypeAny> {
  system: string;
  user: string;
  schema: T;
  images?: ImageInput[];
  maxTokens?: number;
  /** Enable adaptive thinking for reasoning-heavy steps (default true). */
  think?: boolean;
}

type AnyContentBlock = { type: string; text?: string };

/**
 * Ask Claude for a single JSON object matching `schema`. Robust to stray prose:
 * extracts the first balanced JSON value, validates it with Zod, and — on a
 * validation miss — re-asks once with the error appended before giving up.
 *
 * Returns typed, validated data. Throws `AIValidationError` if the model can't
 * produce conforming JSON after the retry.
 */
export async function generateJSON<T extends z.ZodTypeAny>(
  opts: GenerateJSONOptions<T>,
): Promise<z.infer<T>> {
  const { system, schema, images = [], maxTokens = 8000, think = true } = opts;
  const model = serverEnv.anthropicModel;

  const userContent: Anthropic.ContentBlockParam[] = [
    ...images.map(
      (img): Anthropic.ContentBlockParam => ({
        type: "image",
        source: { type: "url", url: img.url },
      }),
    ),
    { type: "text", text: opts.user },
  ];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userContent }];

  async function call(extraSystem = ""): Promise<string> {
    // Build the request as a record so adaptive thinking compiles regardless of
    // the installed SDK's thinking-union typing. Opus 4.8 recommends adaptive
    // thinking and rejects budget_tokens.
    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      system: system + extraSystem,
      messages,
    };
    if (think) body.thinking = { type: "adaptive" };

    const res = await anthropic().messages.create(
      body as unknown as Anthropic.MessageCreateParamsNonStreaming,
    );

    if (res.stop_reason === "refusal") {
      throw new AIValidationError("The model declined to respond to this request.", "");
    }
    return (res.content as AnyContentBlock[])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();
  }

  function tryParse(raw: string): z.infer<T> | null {
    const json = extractJson(raw) ?? raw;
    try {
      const parsed = JSON.parse(json);
      const result = schema.safeParse(parsed);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  // First attempt.
  let raw = await call();
  let parsed = tryParse(raw);
  if (parsed) return parsed;

  // One self-correction retry: tell the model exactly what to fix.
  const retryRaw = await call(
    "\n\nIMPORTANT: Your previous reply could not be parsed as the required JSON. " +
      "Respond with ONLY a single valid JSON object that exactly matches the requested " +
      "structure. No markdown, no code fences, no commentary.",
  );
  parsed = tryParse(retryRaw);
  if (parsed) return parsed;

  throw new AIValidationError(
    "Claude did not return JSON matching the expected schema after a retry.",
    retryRaw || raw,
  );
}
