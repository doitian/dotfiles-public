import xml.etree.ElementTree as ET
import sys

C = {
    "serif": {
        "prefer": ["Roboto Slab"],
        "sc": ["Noto Serif CJK SC"],
        "tc": ["Noto Serif CJK TC"],
        "hk": ["Noto Serif CJK HK"],
        "jp": ["Noto Serif CJK JP"],
        "kr": ["Noto Serif CJK KR"],
    },
    "sans-serif": {
        "title": "Sans",
        "prefer": ["Atkinson Hyperlegible"],
        "sc": ["Noto Sans CJK SC"],
        "tc": ["Noto Sans CJK TC"],
        "hk": ["Noto Sans CJK HK"],
        "jp": ["Noto Sans CJK JP"],
        "kr": ["Noto Sans CJK KR"],
    },
    "monospace": {
        "prefer": ["Cartograph CF"],
        "sc": ["Noto Sans CJK SC"],
        "tc": ["Noto Sans CJK TC"],
        "hk": ["Noto Sans CJK HK"],
        "jp": ["Noto Sans CJK JP"],
        "kr": ["Noto Sans CJK KR"],
    },
    "system-ui": {
        "title": "System UI",
        "prefer": ["Lato"],
        "sc": ["LXGW WenKai"],
        "tc": ["LXGW WenKai"],
        "hk": ["LXGW WenKai"],
        "jp": ["LXGW WenKai"],
        "kr": ["LXGW WenKai"],
    }
}

root = ET.Element('fontconfig')


def alias(name, prefer):
    el = ET.Element('alias', binding="strong")
    ET.SubElement(el, 'family').text = name
    preferEl = ET.SubElement(el, 'prefer')
    for family in prefer:
        ET.SubElement(preferEl, 'family').text = family
    return el


def match(name, lang, append):
    el = ET.Element('match', target="pattern")
    if lang is not None:
        test = ET.SubElement(el, 'test', name="lang", compare="contains")
        ET.SubElement(test, 'string').text = lang
    test = ET.SubElement(el, 'test', name="family")
    ET.SubElement(test, 'string').text = name
    edit = ET.SubElement(el, 'edit', name="family",
                         mode="append", binding="strong")
    for family in append:
        ET.SubElement(edit, 'string').text = family
    return el


def comment(text):
    return ET.Comment(f' {text} ')


for name, spec in C.items():
    root.append(comment(f'Default {name} font'))
    root.append(alias(name, spec['prefer']))

for name, spec in C.items():
    root.append(comment(f'{spec.get("title", name.capitalize())} CJK'))

    root.append(comment(
        f'Default {name} when the "lang" attribute is not given'))
    root.append(comment(
        'You can change this font to the language variant you want'))
    root.append(match(name, None, spec['sc']))

    root.append(comment('Japanese'))
    root.append(comment('"lang=ja" or "lang=ja-*"'))
    root.append(match(name, 'ja', spec['jp']))

    root.append(comment('Korean'))
    root.append(comment('"lang=ko" or "lang=ko-*"'))
    root.append(match(name, 'ko', spec['kr']))

    root.append(comment('Chinese'))
    root.append(comment('"lang=zh" or "lang=zh-*"'))
    root.append(match(name, 'zh', spec['sc']))
    root.append(comment('"lang=zh-hans" or "lang=zh-hans-*"'))
    root.append(match(name, 'zh-hans', spec['sc']))
    root.append(comment('"lang=zh-hant" or "lang=zh-hant-*"'))
    root.append(match(name, 'zh-hant', spec['tc']))
    root.append(comment('"lang=zh-hant-hk" or "lang=zh-hant-hk-*"'))
    root.append(match(name, 'zh-hant-hk', spec['hk']))
    root.append(comment('Compatible'))
    root.append(comment('"lang=zh-cn" or "lang=zh-cn-*"'))
    root.append(match(name, 'zh-cn', spec['sc']))
    root.append(comment('"lang=zh-tw" or "lang=zh-tw-*"'))
    root.append(match(name, 'zh-tw', spec['tc']))
    root.append(comment('"lang=zh-hk" or "lang=zh-hk-*"'))
    root.append(match(name, 'zh-hk', spec['hk']))

doc = ET.ElementTree(root)
ET.indent(doc)
print('<?xml version="1.0"?>')
print('<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">')
doc.write(sys.stdout, encoding='unicode')
print()
