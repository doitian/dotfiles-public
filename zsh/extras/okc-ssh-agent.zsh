if ! pgrep okc-ssh-agent &>/dev/null; then
  okc-ssh-agent >"$PREFIX/tmp/okc-ssh-agent.env"
fi
source "$PREFIX/tmp/okc-ssh-agent.env"
