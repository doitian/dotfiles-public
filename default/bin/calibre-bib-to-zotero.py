#!/usr/bin/env python3

import fileinput
import re

LANG_MAP = {
    "eng": "en-US",
    "zho": "zh-CN",
    "och": "zh-CN",
}

text = "".join(list(fileinput.input(encoding="utf-8")))

text = re.sub(r'^    tags =', '    keywords =', text, flags=re.MULTILINE)
text = re.sub(r'^(    languages = ")(.*)(")', lambda m: m.group(1) +
              LANG_MAP[m.group(2)] + m.group(3), text, flags=re.MULTILINE)
text = re.sub(r'^    custom_pages =', '    pagetotal =',
              text, flags=re.MULTILINE)
text = re.sub(r'^    custom_pages =', '    pagetotal =',
              text, flags=re.MULTILINE)
text = re.sub(r'^    file =.*', lambda m: re.sub(r':([^:]*):[^;"]*', r'\1',
              re.sub(r', :', ';:', m.group(0))), text, flags=re.MULTILINE)

text = re.sub(
    r'^(    note = ")(.*?)(?<!\\)",$',
    lambda m: m.group(
        1) + '\n\\par\n'.join(m.group(2).splitlines()) + '\n\\par\n",',
    text, flags=re.MULTILINE | re.DOTALL
)

print(text.strip())
