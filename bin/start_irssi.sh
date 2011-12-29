#!/bin/bash

function main() {
  local wait=
  if [ "$1" = "-w" ]; then
    wait=1
    shift
  fi

  while ! echo | telnet localhost 6667 2> /dev/null | grep -q 'Connected to'; do
    if [ -n "$wait" ]; then
      sleep 1
    else
      return 1
    fi
  done
  exec irssi "$@"
}

main "$@"
