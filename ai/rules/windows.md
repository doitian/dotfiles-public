## Windows

- Use PowerShell
- PATH already includes common UNIX utilities from Git Bash

### File Operations

- Delete directory recursively: `rm -re -fo path` (not `rm -rf`)
- Delete multiple items: `rm a, b` (comma-separated, not space-separated)
- Create directory (idempotent): `mkdir -fo path`
- Copy recursively: `cp -re src dst`
- Move with overwrite: `mv -fo src dst`

### Line Endings & Encoding

- Always use Linux line endings (LF, not CRLF)
- When using `Set-Content` or `Out-File`, add `-NoNewline` and manage newlines explicitly, or pipe through a conversion
