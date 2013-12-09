#!/bin/bash

cd ~/Dump/Snapshots/ && scrot -e 'geeqie $f &' "$@"
