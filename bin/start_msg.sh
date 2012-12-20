#!/bin/bash

if ! tmux has-session -t mutt; then
  env TMUX= tmux start-server \; set-option -g base-index 1 \; new-session -d -s mutt -n mutt
  tmux new-window -t mutt:2 -n daemons

  tmux send-keys -t mutt:1 mutt C-m
  tmux send-keys -t mutt:2 "cd ~/codebase/daemons; foreman start" C-m

  set-window-option -t mutt:2 monitor-activity off
  set-window-option -t mutt:2 monitor-silence 600
fi

if [ "$1" = "attach" ]; then
  if [ -z $TMUX ]; then
    tmux -u attach-session -t mutt
  else
    tmux -u switch-client -t mutt
  fi
fi
