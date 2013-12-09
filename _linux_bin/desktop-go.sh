#!/bin/sh

choise=$(desktop-list.zsh | gpicker --name="DesktopGo" - | sed 's;/.*$;;')
if [ -n "$choise" ]; then
    wmctrl -s "$choise"
fi
