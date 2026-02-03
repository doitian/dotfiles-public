#!/bin/bash

wlrctl window list |
    awk -F: '{ printf "%s:%s\0icon\x1f%s\n",$1,$2,$1 }' |
    fuzzel --dmenu -w 80 | sed 's/:.*//' |
    xargs -r wlrctl window focus
