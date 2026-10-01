#!/bin/sh
stats=$(agent-berth stats --json 2>/dev/null) || exit 1
[ -n "$stats" ] || exit 1
out=$(jq -cn --argjson s "$stats" '
  ($s | reduce .[] as $p ({running: 0, waiting: 0, idle: 0, done: 0};
      .running += $p.running | .waiting += $p.waiting
      | .idle += $p.idle | .done += $p.done)) as $t
  | (if $t.waiting > 0 then {class: "waiting", symbol: "\uf04c"}
     elif $t.running > 0 then {class: "running", symbol: "\uf04b"}
     elif $t.idle > 0 then {class: "idle", symbol: "\uf186"}
     elif $t.done > 0 then {class: "done", symbol: "\uf00c"}
     else empty end) as $top
  | {
      text: "\($top.symbol)  \($t[$top.class])",
      tooltip: ($s | map("\(.provider): \(.running) running, \(.waiting) waiting, \(.idle) idle, \(.done) done") | join("\n")),
      class: $top.class
    }
') || exit 1
[ -n "$out" ] || exit 1
printf '%s\n' "$out"
