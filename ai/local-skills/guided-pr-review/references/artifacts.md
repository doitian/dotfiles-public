# Other agents with native HTML artifacts

Use the native HTML artifact or canvas capability exposed in this session. Create or update one surface from `review-artifact.html`, the fragment containing the title, styles, markup, script, context, and complete diff without a document wrapper. Use `review.html` only if the host explicitly accepts a standalone HTML document. Keep one stable artifact identity for the captured snapshot and direct chunk navigation inside the page. Do not start the local server for this path.

Follow the host's documented tool contract. Where a document store can be granted to the artifact, declare it at publish time and adapt persistence to that documented capability. Do not assume a provider-specific store, a localhost endpoint, or an artifact-to-chat bridge exists. Verify that notes survive reload and that the assistant can read them before promising **answer my saved notes**.

Without an agent-readable store, use the host's authorized comment channel when it is exposed, or **Copy questions** and the user's pasted/exported notes. The UI probes browser storage and keeps notes in memory when storage is blocked; browser storage alone is not an assistant-readable handoff. Prefer native comments only when this artifact actually exposes them.

If the complete diff exceeds the artifact's limits or executable HTML is unavailable, read [local-browser.md](local-browser.md) for the local or files-only fallback. Do not omit files or split the review into disconnected surfaces to fit.

Emit pause checkpoints in conversation and save `checkpoint.md` beside the review when a durable writable directory is available. Otherwise the conversation checkpoint is the resume record. Preserve annotations and user progress when updating or saving the review.

An ordinary browser or sandbox test establishes only the rendering and fallbacks that were exercised. Verify the native runtime when its tools are available, and report any remaining gap.
