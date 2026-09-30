# Local browser and files-only review

Use `review.html`, the standalone document containing the full context and diff. No provider-specific API is required. With a shell and browser, run:

```sh
python3 scripts/serve.py --directory /path/to/review
```

Keep the server running in a tool-managed process session. It binds only to `127.0.0.1`, chooses an available port, and records its URL in `review-server.json`. Reuse a running server for that output directory instead of starting duplicates. To resume after it stops, rerun the command; notes remain on disk.

Open the returned URL with the environment's browser-opening tool. Codex may expose `open_in_codex`; a normal browser also works. The server persists questions, drafts, navigation, and review progress in `review-notes.json` beside the review. Explain the handoff **answer my saved notes** and read that file when the user asks to continue.

## Files-only fallback

Without a running server, open the standalone `review.html` through `file:` or the host's file viewer. The UI probes browser storage and keeps notes in memory if storage is blocked. Explain **Copy questions** or **Export notes** as the return path; the assistant cannot read browser storage merely because it created the page. If storage is unavailable, the user must copy notes before closing or replacing the view.

Keep the complete diff, direct navigation, and old/new line anchors. Do not turn navigation into another model request or discard changes to fit a viewer's limits.

## Checkpoints and verification

Emit pause checkpoints in conversation and save `checkpoint.md` beside the review when its directory is writable. Preserve `review-notes.json`; saving a checkpoint does not change annotations or progress. With no durable writable output, the conversation checkpoint is the resume record.

Verify the actual browser page and file persistence. A sandbox test with networking, storage, clipboard, and downloads blocked verifies copy/export fallbacks. These checks establish only the local or files-only path that was exercised.
