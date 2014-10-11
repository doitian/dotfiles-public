#!/bin/bash
export PATH="/usr/local/bin:$PATH"

cd ~/Downloads/
find . Thunder -depth 1 ! -name '.*' ! -name '$*' ! -name 'desktop.ini' ! -path './Old' ! -path './RTX' ! -path './Snapshots' ! -path './Thunder' ! -path './keyiDownload' \( \( -mtime -4d -exec tag -a new '{}' \; \) -o -true \) \( \( \( -mtime +4d -o -mtime 4d \) -exec tag -r new '{}' \; \) -o -true \) \( \( -mtime +15d -exec mv '{}' ~/Downloads/Old/ \; \) -o -true \) > /dev/null

find Snapshots RTX -depth 1 ! -name '.*' ! -name '$*' ! -name 'desktop.ini' -mtime +7d -print0 | xargs -0 ~/.rm-trash/rm.rb -rf --no-color > /dev/null
