export const THINKING_EFFORTS = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
];

export function resolveThinking(thinking, defaultEffort, noThinking = false) {
  const effort = thinking ?? (noThinking ? "none" : defaultEffort);
  if (effort !== undefined && !THINKING_EFFORTS.includes(effort)) {
    throw new Error(
      `Invalid --thinking value: ${effort}. Expected ${THINKING_EFFORTS.join("|")}.`,
    );
  }
  if (noThinking && effort !== "none") {
    throw new Error("--no-thinking conflicts with --thinking unless it is none.");
  }
  return effort;
}

export function reasoningEffortBody(thinking) {
  const effort = resolveThinking(thinking);
  return effort === undefined ? {} : { reasoning_effort: effort };
}

export function thinkingHelp(defaultEffort) {
  return `  --thinking <effort>   Reasoning effort (default: ${defaultEffort})
                        Values: ${THINKING_EFFORTS.join("|")}
                        Supported efforts depend on the configured model.`;
}
