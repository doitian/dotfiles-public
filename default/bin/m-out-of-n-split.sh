#!/bin/bash

if (( "$#" != 3 )); then
  echo "Usage: m-out-of-n-split.sh m n file"
fi

m="$1"
n="$2"
file="$3"
lineno=1
padding=" "
head=1

for id in $(seq $n); do
  if [ -f "$file.$id" ]; then
    echo "$file.$id already exists" >&2
    exit 127
  fi
done

while IFS= read -r line; do
  if (( lineno > 9 )); then
    padding=""
  fi

  for i in $(seq $m); do
    echo "$padding$lineno: $line" >> "$file.$head"
    head=$(( (head % n) + 1 ))
  done

  lineno=$(( lineno + 1 ))
done < "$file"
