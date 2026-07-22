---
name: create-google-task
description: Create a Google Task via the IFTTT JSON webhook
---

Create a Google Task by POSTing JSON to the IFTTT Maker webhook.

## Webhook

```
https://maker.ifttt.com/trigger/task/json/with/key/{IFTTT_MAKER_TASK_KEY}
```

Replace `{IFTTT_MAKER_TASK_KEY}` with the real key before calling the URL. Never
commit or hardcode the key in the skill or repo.

### Key resolution

1. Read `$env:IFTTT_MAKER_TASK_KEY` (PowerShell) or `$IFTTT_MAKER_TASK_KEY`.
2. If unset, ask the user for the key and use it only for this request.

## Payload

```json
{
  "title": "Task title here - one line",
  "notes": "Optional detailed notes\nCan include line breaks",
  "due": "2026-07-25T23:59:59Z"
}
```

| Field   | Required | Notes                                      |
| ------- | -------- | ------------------------------------------ |
| `title` | yes      | Single-line task title                     |
| `notes` | no       | Detail text; `\n` allowed for line breaks  |
| `due`   | no       | ISO 8601 UTC datetime (e.g. `...T23:59:59Z`) |

Omit optional fields when unused. Do not send empty strings for them.

## How to call

Use PowerShell. Example with all fields:

```powershell
$key = $env:IFTTT_MAKER_TASK_KEY
if (-not $key) { throw "IFTTT_MAKER_TASK_KEY is not set" }

$body = @{
  title = "Task title here - one line"
  notes = "Optional detailed notes`nCan include line breaks"
  due   = "2026-07-25T23:59:59Z"
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "https://maker.ifttt.com/trigger/task/json/with/key/$key" `
  -ContentType "application/json" `
  -Body $body
```

Title only:

```powershell
$body = @{ title = "Buy milk" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://maker.ifttt.com/trigger/task/json/with/key/$key" -ContentType "application/json" -Body $body
```

## When to use

- User asks to create, add, or schedule a Google Task / todo
- User wants something tracked in Google Tasks

## Rules

- Confirm `title` (and `notes` / `due` if relevant) when the user request is ambiguous
- Prefer ISO 8601 UTC for `due`; if the user gives a local date/time, convert and state the value used
- Report success or the error response briefly after the request
- Do not log or echo the full webhook URL with the key embedded
