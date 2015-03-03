# /etc/profile may reset PATH, check and restore it use zshrc
if ! echo "$PATH" | grep -q "$HOME/bin"; then
  source "$HOME/.zshenv"
fi
