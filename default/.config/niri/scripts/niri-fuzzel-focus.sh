#!/bin/bash

niri msg --json windows |
    jq -r '
        sort_by(.workspace_id, .layout.pos_in_scrolling_layout[0])[]
        | .id as $id
        | .workspace_id as $ws
        | .layout.pos_in_scrolling_layout[0] as $col
        | .app_id as $app
        | "\($id) \($ws):\($col) [\($app)] \(.title)\u0000icon\u001f\($app | ascii_downcase)"
    ' |
    fuzzel --dmenu --nth-delimiter ' ' --with-nth '{2..}' --accept-nth 1 -w 78 | sed 's/.*\t//' |
    xargs -r -I{} niri msg action focus-window --id {}
