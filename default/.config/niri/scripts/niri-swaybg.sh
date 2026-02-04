#!/bin/bash

WALLPAPERS_DIR=~/Pictures/Wallpapers

if [[ ! -d "$WALLPAPERS_DIR" ]]; then
    echo "Error: Wallpapers directory not found: $WALLPAPERS_DIR" >&2
    exit 1
fi

killall swaybg 2>/dev/null

wallpaper=$(find "$WALLPAPERS_DIR" -type f | shuf -n 1)

if [[ -z "$wallpaper" ]]; then
    echo "Error: No wallpapers found in $WALLPAPERS_DIR" >&2
    exit 1
fi

exec swaybg -m fill -i "$wallpaper"
