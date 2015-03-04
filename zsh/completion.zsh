function _tmux-up-dwim() {
  compadd $(tmux list-session &> /dev/null| awk -F: '{print $1}'; find -L ~/.tmux-up -name '*.conf' | sed -e 's:.*/::' -e 's:.conf$::')
}

compdef _tmux-up-dwim tmux-up-dwim
