#!/bin/sh

cd ~/Music
if ! tmux has-session -t cmus; then
  env TMUX= tmux start-server \; set-option -g base-index 1 \; new-session -d -s cmus -n cmus

  tmux send-keys -t cmus:1 cmus C-m
fi

if [ "$1" = "attach" ]; then
  if [ -z $TMUX ]; then
    tmux -u attach-session -t cmus
  else
    tmux -u switch-client -t cmus
  fi
fi
