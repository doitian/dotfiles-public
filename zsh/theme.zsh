if [ "$TERM" = dumb ]; then
  return 0
fi

autoload colors; colors;
setopt prompt_subst

# reset 00
# black 30
# red 31 bright 1;31 background 41
# green 32
# yellow 33
# blue 34
# magenta 35
# cyan 36
# white 37

RPROMPT='%(1j.%K{black}%F{yellow}'$'\ue0b2''%F{white}%K{yellow} %j .)%(?..%F{red}%(1j|%K{yellow}|%K{black})'$'\ue0b2''%F{white}%K{red} %? %f%k'
PROMPT='
%F{white}%K{blue} %(4~|%-1~/…/%2~|%~) %F{blue}%K{white}'$'\ue0b0'' %k%F{white}'$'\ue0b0'' %f%k'
