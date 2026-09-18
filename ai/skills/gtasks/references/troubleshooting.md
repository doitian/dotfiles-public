# Troubleshooting keystore access

`gtasks` reads OAuth client credentials and the refresh token from the OS
keystore through Bun Secrets, as well as environment variables. Errors such
as `Missing GWS_CLIENT_ID` can mean the current process cannot access the
keystore, rather than that credentials are absent. Let `gtasks` read the
keystore; do not extract or print secrets.

## Codex sandbox

This procedure applies to Codex's `exec_command` tool, not to other agents.
If credential lookup fails inside the Codex sandbox, retry the same authorized
command once with `sandbox_permissions: "require_escalated"` and explain that
`gtasks` needs access to the user's OS keystore. Use this option only when
the current Codex environment supports escalation.

This retry is appropriate when authentication failed before any Google Tasks
mutation. If the server outcome is uncertain, read current task data before
retrying a mutation to avoid duplicates.

If execution outside the sandbox is unavailable or denied, report the
keystore-access limitation. If the retry still reports missing credentials,
relay the specific setup error and ask the user to run the indicated setup
command or `gtasks auth` in their own terminal; do not handle credentials
yourself. Other agents should use their own documented permission mechanisms;
do not assume they support Codex's sandbox options.
