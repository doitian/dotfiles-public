/**
 * Shared OpenAI client setup and streaming completion for CLI scripts.
 */
import { OpenAI } from "openai";

export { OpenAI };

/**
 * Extra body fields to disable thinking on Qwen/DashScope hybrid models.
 * Official OpenAI has no equivalent; unknown params are omitted.
 * @param {string} model
 * @param {boolean} [noThinking]
 */
export function extraBodyForThinking(model, noThinking) {
  if (!noThinking || !/qwen/i.test(model)) return {};
  return { enable_thinking: false };
}

/**
 * Run streaming chat completion; write content deltas to output stream.
 * @param {OpenAI} client
 * @param {string} model
 * @param {import('openai').ChatCompletionMessageParam[]} messages
 * @param {{ outputStream?: NodeJS.Writable, temperature?: number, noThinking?: boolean }} [options]
 * @throws {Error} on API error or when finish_reason is content_filter/refusal
 */
export async function streamCompletion(client, model, messages, options = {}) {
  const { outputStream = process.stdout, temperature = 0.3, noThinking = false } =
    options;
  const extra_body = extraBodyForThinking(model, noThinking);
  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
    ...extra_body,
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
 * @param {{ systemPrompt?: string | null, input: string, noThinking?: boolean }} options
 * @throws {Error} when input is empty, or on API/refusal from streamCompletion
 */
export async function runOneshot(client, model, options) {
  const { systemPrompt, input, noThinking } = options;
  if (!input.trim()) {
    throw new Error("No input on stdin.");
  }
  const messages = [];
  if (systemPrompt != null && systemPrompt.trim() !== "") {
    messages.push({ role: "system", content: systemPrompt.trim() });
  }
  messages.push({ role: "user", content: input });
  await streamCompletion(client, model, messages, { noThinking });
}
