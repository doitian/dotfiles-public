# Choose a review surface

Choose by capabilities exposed in the current session, not just by model name. Preserve the same chunk objectives, full diffs, direct navigation, and old/new line anchors everywhere.

| Available environment | Preferred surface | Questions return through |
| --- | --- | --- |
| Claude with an Artifact capability | One native HTML Artifact | A declared document store, available comments, or Copy questions |
| Another agent with an interactive artifact/canvas | Its native HTML-capable surface | Documented host handoff, otherwise Copy questions |
| Local coding agent with a shell and browser | `review.html` with `scripts/serve.py` | `review-notes.json` |
| Files only | Standalone HTML | Copy questions or notes export |

## Claude

Prefer the native **Artifact** capability when it is available. Publish `review-artifact.html` through the tool contract exposed in that Claude session, and keep one artifact with direct chunk navigation.

`review-artifact.html` is page content, not a document: the title, styles, markup, and script with no `<!doctype>`, `<html>`, `<head>`, or `<body>` wrapper, because the host supplies that skeleton. `review.html` remains the standalone document for every other surface. Publishing the standalone file where a skeleton is added produces a nested document; publish the artifact build instead.

Redeploy the same file path to keep one URL and a stable identity. A first publish also wants a favicon and a one-line description; keep the favicon and title unchanged afterwards, since they are how the user finds the review again. To update a review published in an earlier session, pass that artifact's URL and read its current version before publishing over it.

The page loads nothing external and starts no download, which is what the artifact sandbox requires: no CDN, no `fetch`, no `<a download>`. That is why the artifact build shows notes as copyable text instead of saving a file.

For notes that survive a reload and that the assistant can read back, declare the session's document-store capability at publish time. The page feature-detects it, and when it is granted keeps one document at `reviews/<reviewId>` holding `notes`, `reviewed`, `current`, and the snapshot commits; read that document back with the host's database read instead of asking for a paste. Drafts and per-viewer progress stay in browser storage. Without the declaration `claude.use` resolves nothing, the page falls back to browser storage, and the handoff is **Copy questions**. A store-backed artifact is organization-internal, which suits private review.

Viewer comment threads are a second return path where the host exposes them: read the threads the user has sent to Claude, answer in the thread, and resolve only what was actually addressed.

Capabilities and their declaration shapes vary by surface and change over time. Consult the artifact capability and design references available in that session, or the [Claude Artifact documentation](https://code.claude.com/docs/en/artifacts), rather than assuming a localhost endpoint, a script-triggered download, or an Artifact-to-chat API exists.

## Other agents and local browsers

No Codex API is required by the page. With local file access, use the bundled server and the host's browser opener. Codex may use `open_in_codex`; other agents can return/open the local URL with their own tools. When a server is unavailable, use the standalone or artifact page with its copyable questions.

The UI probes browser storage and keeps notes in memory if storage is blocked. On that fallback, the user must copy notes before closing or replacing the page. The assistant cannot read browser storage merely because it created the artifact. For durable cloud storage, adapt to a documented host capability only after verifying its availability and access scope.

If the host cannot render the full diff within its limits, keep a complete standalone review as the fallback and explain the limit. Do not silently drop files or turn every navigation click into another model request.

## Validation boundary

An ordinary browser test verifies the HTML. A sandbox test with networking, storage, clipboard, and downloads blocked verifies fallbacks. Neither proves that an unavailable Claude Artifact tool has been exercised. Report that distinction when relevant; use the actual native tool when working inside that host.
