#!/usr/bin/env bash

set -e
set -u
[ -n "${DEBUG:-}" ] && set -x || true

sed \
  -e 's/^    tags =/    keywords =/' \
  -e 's/^    languages = "eng"/    langid = "english"/' \
  -e 's/^    languages = "zho"/    langid = "chinese"/' \
  -e 's/^    custom_pages =/    pagetotal =/' \
  -e '/^    file =/{s/, :/;:/g;s/:\([^:]*\):[^;"]*/\1/g;}' \
  "$@"
