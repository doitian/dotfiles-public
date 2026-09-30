# ChatGPT and Codex review

Honor an explicit user choice. Otherwise prefer a ChatGPT Page when Pages creation, reading, and visualization tools are available and the complete review fits the embed limit. If using another native HTML surface, read [artifacts.md](artifacts.md); for a local browser or files-only fallback, read [local-browser.md](local-browser.md). Read the rest of this reference only for the Pages path.

## ChatGPT Pages

Use the installed Pages writing guidance and content catalog when available, and the session's actual tool schemas. [Official Pages documentation](https://learn.chatgpt.com/docs/space/pages) describes native content, comments, and interactive visualizations. Ordinary Markdown cannot execute the review HTML; use `create_page_visualization` for the interactive surface.

Read `pages-compatibility.json` before publishing. The current visualization upload limit is 256 KiB of UTF-8 HTML, including the embedded diff. If `embeddable` is false, use the complete artifact or local HTML fallback and optionally keep the review map and checkpoint on a Page. Do not truncate diffs, omit generated files, or split the surface into independent embeds to fit. A link or summary alone is not the completed review surface. Without the Python helpers, measure the equivalent fragment against the exposed tool's current limit.

For a Pages review:

1. Resolve any user-specified Page, parent, or Space, and read its guidance. With no destination specified, create a private standalone Page. Do not broaden sharing or choose a shared Space merely to make the review discoverable.
2. Create native Page blocks for the purpose and captured PR/head/base identity, the concise risk-ordered review map, and a checkpoint section. Keep explanatory content editable; the embed holds the detailed chunk context, full diffs, line-question controls, and navigation. Do not duplicate the Page title as the opening heading.
3. Read the Page, then call `create_page_visualization` with its `page_id`, the full `review-pages.html` string, and a descriptive title. Use observed block IDs and any sequence to place the embed. This tool uploads and inserts it; pasting raw HTML or an ordinary file link does not. Do not run `serve.py` for this path.
4. Inspect the receipt, read the saved Page, and verify the rendered embed when a preview is available. Check chunk navigation, complete file coverage, old/new line questions, persistence, and narrow layouts. A successful upload or a browser shim does not prove that the live Pages runtime worked.
5. Keep the returned Page URL, Page ID, visualization reference, and embed block ID with the local review output when available. For a context-only revision, update native content surgically and replace the existing embed using its observed block/hash and current sequence. Preserve and verify its widget notes across replacement; if the host binds state to the new file and does not preserve it, retain the old annotated embed and export/reconcile its notes before switching. A new head or changed chunk plan gets a new review snapshot and Page; keep the old Page and anchors.

### Questions and personal progress

`review-pages.html` feature-detects `window.openai.setWidgetState`. It reads the initial `widgetState` and applies incoming `openai:set_globals` updates without writing defaults back. Saved questions use `modelContent` with `version`, `reviewId`, `head`, `base`, `url`, and `notes`; each note retains its chunk/file/side/line anchor. The adapter rejects incompatible snapshot identities and invalid note anchors. It merges pending local note edits into the latest observed shared notes before saving and retains pending changes on failure.

Widget state is shared across Page collaborators, including `privateContent`. The adapter therefore keeps **Reviewed by me**, the current chunk, and drafts in browser storage when available, or memory otherwise. It shares only saved questions, preserves existing private state, and never writes merely because a Page opened or an incoming update arrived. The question text/JSON export includes the viewer's completion and current chunk for an explicit handoff. Do not infer individual completion from shared notes or native Page checklists.

The current widget snapshot limit is under 16 KiB, including both state fields. An oversized or failed save leaves the user's questions available for Copy questions and labels the shared-save gap. Do not promise atomic concurrent edits: host writes replace the widget snapshot. For simultaneous reviewers, prefer native Page comment threads and include the chunk, file, old/new line or whole-file scope, and captured revision in the comment text. Native comments attach to Page blocks or selected text; they do not automatically map into embedded diff lines, and the embed cannot post Page comments through an invented bridge.

When the user asks to answer saved notes, read the Page with its supported read tool. Inspect the embed's returned `visualization_state` metadata for its exposed `modelContent` projection, using the actual returned shape. Validate the recorded review/head/base and answer those notes. Read relevant native comment threads with `list_page_comments` and use observed thread IDs for authorized replies. If the model projection is absent, incomplete, or unavailable, ask for Copy questions; do not claim access to `privateContent`, browser storage, or an unexposed artifact database. Saving widget state does not send a chat message or start an agent turn.

Keep pause checkpoints in native Page content with guarded edits, preserving user text and comments. Record only completion explicitly known from conversation or the user's copied progress. Do not enable automatic upkeep or refresh the captured PR revision as a side effect of this workflow.

## Verification boundary

A browser test or Pages widget shim verifies local rendering and adapter behavior; it does not verify the live Pages service. Report which runtime was exercised.
