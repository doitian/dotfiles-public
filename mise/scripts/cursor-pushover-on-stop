#!/usr/bin/env bash

STATUS=$(jq -r .status)
agent-pushover -t "Cursor Agent Stopped" "status: ${STATUS:-unknown}" >/dev/null 2>/dev/null
echo '{}'
