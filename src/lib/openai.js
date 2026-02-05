/**
 * Shared OpenAI client setup and streaming completion for CLI scripts.
 * Reads API key, base URL, and model from environment variables, with optional
 * defaults (e.g. from build-time config) passed by the caller.
 */
import { OpenAI } from "openai";

/**
 * Create an OpenAI client and resolve model. Exits with code 1 if API key is missing.
 * @param {{ apiKey?: string, baseURL?: string, model?: string }} [defaults] – Optional defaults (env wins when set).
 * @returns {{ client: OpenAI, model: string }}
 */
export function getOpenAIClient(defaults = {}) {
  const apiKey = process.env.OPENAI_API_KEY ?? defaults.apiKey;
  const baseURL =
    process.env.OPENAI_BASE_URL ?? defaults.baseURL ?? "https://api.openai.com";
  const model = process.env.OPENAI_MODEL ?? defaults.model ?? "gpt-4o-mini";
  if (!apiKey) {
    console.error("Missing API key: set OPENAI_API_KEY.");
    process.exit(1);
  }
  const client = new OpenAI({ apiKey, baseURL });
  return { client, model };
}

/**
 * Run streaming chat completion; write content deltas to output stream.
 * @param {OpenAI} client
 * @param {string} model
 * @param {import('openai').ChatCompletionMessageParam[]} messages
 * @param {{ outputStream?: NodeJS.Writable, temperature?: number }} [options]
 * @throws {Error} on API error or when finish_reason is content_filter/refusal
 */
export async function streamCompletion(client, model, messages, options = {}) {
  const { outputStream = process.stdout, temperature = 0.3 } = options;
  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
  });

  let lastChunk = null;
  let lastChar = "";
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta != null && delta !== "") {
      outputStream.write(delta);
      lastChar = delta.slice(-1);
    }
    lastChunk = chunk;
  }

  const finishReason = lastChunk?.choices?.[0]?.finish_reason;
  if (finishReason === "content_filter" || finishReason === "refusal") {
    const err = new Error("Model refused or content filtered.");
    err.finishReason = finishReason;
    throw err;
  }
  if (lastChar !== "\n") outputStream.write("\n");
}

/**
 * One-shot streaming completion: optional system prompt + user input.
 * Builds messages and calls streamCompletion. Caller handles errors and exit.
 * @param {OpenAI} client
 * @param {string} model
 * @param {{ systemPrompt?: string | null, input: string }} options
 * @throws {Error} when input is empty, or on API/refusal from streamCompletion
 */
export async function runOneshot(client, model, options) {
  const { systemPrompt, input } = options;
  if (!input.trim()) {
    throw new Error("No input on stdin.");
  }
  const messages = [];
  if (systemPrompt != null && systemPrompt.trim() !== "") {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }
  messages.push({ role: "user", content: input });
  await streamCompletion(client, model, messages);
}
