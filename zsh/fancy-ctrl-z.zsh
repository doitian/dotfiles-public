fancy-ctrl-z () {
  if [[ $#BUFFER -gt 0 ]]; then
    zle push-input -w
  fi

  fg
  zle get-line -w
  zle clear-screen -w
}
zle -N fancy-ctrl-z
bindkey '^Z' fancy-ctrl-z
