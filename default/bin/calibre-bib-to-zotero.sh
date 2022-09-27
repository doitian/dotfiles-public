#!/usr/bin/env bash

set -e
set -u
[ -n "${DEBUG:-}" ] && set -x || true

sed \
  -e 's/^    tags =/    keywords =/' \
  -e 's/^    languages = "eng"/    langid = "en-US"/' \
  -e 's/^    languages = "zho"/    langid = "zh-CN"/' \
  -e 's/^    languages = "och"/    langid = "zh-CN"/' \
  -e 's/^    custom_pages =/    pagetotal =/' \
  -e '/^    file =/{s/, :/;:/g;s/:\([^:]*\):[^;"]*/\1/g;}' \
  "$@"
