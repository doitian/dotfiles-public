#!/bin/bash
export PATH="/usr/local/bin:$PATH"

cd ~/Downloads/
find . Thunder -depth 1 ! -name '.*' ! -name '$*' ! -name 'desktop.ini' ! -path './Old' ! -path './RTX' ! -path './Snapshots' ! -path './Thunder' \( \( -Btime -4d -exec tag -a New '{}' \; \) -o -true \) \( \( \( -Btime +4d -o -Btime 4d \) -exec tag -r New '{}' \; \) -o -true \) \( \( -Btime +15d -exec mv '{}' ~/Downloads/Old/ \; \) -o -true \) > /dev/null

find Snapshots RTX -depth 1 ! -name '.*' ! -name '$*' ! -name 'desktop.ini' -Btime +7d -print0 | xargs -0 ~/.rm-trash/rm.rb -rf --no-color > /dev/null

