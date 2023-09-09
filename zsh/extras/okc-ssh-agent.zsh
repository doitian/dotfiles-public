if ! pgrep okc-ssh-agent &>/dev/null; then
  okc-ssh-agent >"$HOME/.okc-ssh-agent.env"
fi
source "$HOME/.okc-ssh-agent.env"
