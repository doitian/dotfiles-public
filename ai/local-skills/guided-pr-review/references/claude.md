# Claude Artifact review

Prefer the native **Artifact** capability when it is available. Publish `review-artifact.html` through the tool contract exposed in that Claude session, and keep one artifact with direct chunk navigation.

`review-artifact.html` is a fragment containing the title, styles, markup, and script with no `<!doctype>`, `<html>`, `<head>`, or `<body>` wrapper, because the host supplies that skeleton. Publishing the standalone document where a skeleton is added produces a nested document; publish the artifact build instead.

Redeploy the same file path to keep one URL and a stable identity. A first publish also wants a favicon and a one-line description; keep the favicon and title unchanged afterwards, since they are how the user finds the review again. To update a review published in an earlier session, pass that artifact's URL and read its current version before publishing over it.

The page loads nothing external and starts no download, which is what the artifact sandbox requires: no CDN, no `fetch`, no `<a download>`. That is why the artifact build shows notes as copyable text instead of saving a file.

For notes that survive a reload and that the assistant can read back, declare the session's document-store capability at publish time. The page feature-detects it, and when it is granted keeps one document at `reviews/<reviewId>` holding `notes`, `reviewed`, `current`, and the snapshot commits; read that document back with the host's database read instead of asking for a paste. Drafts stay in browser storage. Without the declaration `claude.use` resolves nothing, the page falls back to browser storage, and the handoff is **Copy questions**. A store-backed artifact is organization-internal, which suits private review.

Viewer comment threads are a second return path where the host exposes them: read the threads the user has sent to Claude, answer in the thread, and resolve only what was actually addressed.

Capabilities and their declaration shapes vary by surface and change over time. Consult the artifact capability and design references available in that session, or the [Claude Artifact documentation](https://code.claude.com/docs/en/artifacts), rather than assuming a localhost endpoint, a script-triggered download, or an Artifact-to-chat API exists.

Keep the artifact identity stable for the captured snapshot. Do not start the local server for this path. If the complete diff exceeds the artifact host's limits or the Artifact capability is unavailable, read [local-browser.md](local-browser.md) for the local or files-only fallback. Do not omit changes to fit.

## Handoff and checkpoints

Explain **answer my saved notes** only when a granted document store or authorized comment channel is readable by the assistant; otherwise use **Copy questions**. Read the granted store, available comment threads, or the user's pasted questions when continuing. Never assume browser storage is agent-readable.

Emit pause checkpoints in conversation and save `checkpoint.md` beside the review when a writable review directory is available. Do not overwrite annotation state while saving the checkpoint.

## Verification boundary

An ordinary browser or sandbox test does not prove that the live Claude Artifact tool was exercised. Report which runtime was tested.
