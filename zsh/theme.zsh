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

RPROMPT='%(1j.%{[43m%}%{[1;30m%} %%%j %{[00m%}.)%(?..%{[41m%}%{[1;30m%} !%? %{[00m%})'
PROMPT='%{[32m%}%(4~|%-1~/…/%2~|%~) %(!.%{[31m%}#.$)%{[00m%} '
