#!/bin/bash

if ! tmux has-session -t mutt; then
  env TMUX= tmux start-server \; set-option -g base-index 1 \; new-session -d -s mutt -n mutt
  tmux new-window -t mutt:2 -n offlineimap
  tmux new-window -t mutt:3 -n tunnel
  tmux new-window -t mutt:4 -n openvpn
  tmux new-window -t mutt:5 -n mu-index

  tmux send-keys -t mutt:1 mutt C-m
  tmux send-keys -t mutt:2 offlineimap C-m
  tmux send-keys -t mutt:3 "ssh -D 9999 iany.me"
  tmux send-keys -t mutt:4 "ovpn --route intridea"
  tmux send-keys -t mutt:5 "while true; do; mu index --maildir ~/Mail; sleep 300; done" C-m

  set-window-option -t mutt:2 monitor-activity off
  set-window-option -t mutt:2 monitor-silence 120
  set-window-option -t mutt:5 monitor-activity off
  set-window-option -t mutt:5 monitor-silence 600
fi

if [ "$1" = "attach" ]; then
  if [ -z $TMUX ]; then
    tmux -u attach-session -t mutt
  else
    tmux -u switch-client -t mutt
  fi
fi
