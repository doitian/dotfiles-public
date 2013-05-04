#!/bin/bash

if ! tmux has-session -t msg; then
  env TMUX= tmux start-server \; set-option -g base-index 1 \; new-session -d -s msg -n daemons
  tmux new-window -t msg -n mutt
  tmux new-window -t msg -n weechat

  tmux send-keys -t msg:1 "cd ~/codebase/daemons; foreman start" C-m
  tmux send-keys -t msg:2 "cd ~/Mail; mutt" C-m
  tmux send-keys -t msg:3 "cd ~/.weechat; weechat-curses" C-m

  set-window-option -t msg:1 monitor-activity off
  set-window-option -t msg:1 monitor-silence 600
fi

if [ "$1" = "attach" ]; then
  if [ -z $TMUX ]; then
    tmux -u attach-session -t msg
  else
    tmux -u switch-client -t msg
  fi
fi
