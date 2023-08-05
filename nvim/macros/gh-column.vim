silent! v/^\[/d
%s/^\[/* [/e
%s/\](\//](https:\/\/github.com\//e
%s/opened by \[\(.*\)\].*/opened by @\1/e
