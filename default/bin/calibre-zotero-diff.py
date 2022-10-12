#!/usr/bin/env python3

import csv
import datetime
import os
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path

BIB_ENTRY_RE = re.compile(r'\s+([\S]+)\s*=\s*{(.*)},?')
BIB_DOUBLE_QUOTE_RE = re.compile(r'{{([^}]+)}}')
BIB_SINGLE_QUOTE_RE = re.compile(r'{([^}]+)}')
BIB_ESCAPE_RE = re.compile(r'\\([&_#])')
WHITESPACE_RE = re.compile(r'\s+')
LINK_RE = re.compile(r'¡(.*?)¿')


def unquote(text):
    text = BIB_DOUBLE_QUOTE_RE.sub(r'\1', text)
    text = BIB_SINGLE_QUOTE_RE.sub(r'\1', text)
    text = BIB_ESCAPE_RE.sub(r'\1', text)
    return text


def parse_bib_entry(line):
    match = BIB_ENTRY_RE.match(line)
    if match:
        return (match.group(1), unquote(match.group(2)))


def ignore_formatter(*_):
    return True


def default_formatter(left, _):
    return left


def rating_formatter(text, is_zotero):
    rating = int(text)
    if is_zotero:
        rating = rating / 2
    return rating


def int_formatter(text, _):
    return int(text.split(".")[0]) if text != "" else 0


def ignore_whitespaces_formatter(text, _):
    return WHITESPACE_RE.sub(' ', text).strip()


def rich_text_formatter(text, is_zotero):
    if text.startswith('\\section{Annotations'):
        return ''
    text = ignore_whitespaces_formatter(text, is_zotero)
    text = text.replace('–', '--')
    text = LINK_RE.sub(r'<\1>', text)
    return text


def size_formatter(text, _):
    return text.split(' ')[0]


def timestamp_formatter(text, is_zotero):
    if is_zotero:
        return text

    return datetime.datetime.fromisoformat(text).astimezone(datetime.timezone.utc).strftime('%Y-%m-%d')


def date_formatter(text, _):
    return text[0:7]


def isbn_formatter(text, _):
    return text.replace('-', '')


def author_formatter(text, is_zotero):
    if is_zotero:
        authors = []
        for author in text.split(' and '):
            parts = author.split(', ', maxsplit=1)
            authors.append(f'{parts[1]} {parts[0]}' if len(
                parts) == 2 else author)
        return ' & '.join(authors)

    return text


def ignore_case_formatter(text, _):
    return text.lower()


def join_lines_formatter(text, _):
    return text.replace('\n', ' ')


def langid_formatter(text, _):
    if text == 'eng' or text == 'american':
        return 'en-US'
    elif text == 'zho':
        return 'zh-CN'
    elif text == 'och':
        return 'zh-CN'
    else:
        return text


def keywords_formatter(text, _):
    keywords = sorted(text.replace(', ', ',').split(','))
    try:
        keywords.remove('_tablet')
    except ValueError:
        pass
    try:
        keywords.remove('_tablet_modified')
    except ValueError:
        pass
    return keywords


ALIASES = {
    'calibreid': 'id',
    'custom_progress': '#progress',
    'pagetotal': '#pages',
    'keywords': 'tags',
    'custom_topic': '#topic',
    'note': 'comments',
    'author': 'authors',
    'volume': 'series_index',
    'date': 'pubdate',
    'langid': 'languages',
    'custom_metadata': '#metadata',
    'custom_mdnotes': '#mdnotes',
}


FORMATTERS = {
    'rating': rating_formatter,
    'note': rich_text_formatter,
    'size': size_formatter,
    'cover': ignore_formatter,
    'timestamp': timestamp_formatter,
    'date': date_formatter,
    'volume': int_formatter,
    'file': ignore_formatter,
    'isbn': isbn_formatter,
    'author': author_formatter,
    'options': ignore_formatter,
    'title': ignore_case_formatter,
    'langid': langid_formatter,
    'keywords': keywords_formatter,
    'custom_mdnotes': join_lines_formatter,
    'custom_metadata': join_lines_formatter,
}


csv_fd, csv_path = tempfile.mkstemp(suffix='.csv', text=True)
csv_path = Path(csv_path)

calibredb = {}
try:
    subprocess.check_call(['calibredb', 'catalog', str(csv_path)])
    csv_io = os.fdopen(csv_fd, encoding='utf-8-sig')
    csv_reader = csv.DictReader(csv_io)
    for row in csv_reader:
        calibredb[row['id']] = row
finally:
    csv_path.unlink()

# example_row = {
#     'author_sort': 'Young, Scott',
#     'authors': 'Scott Young',
#     'comments': '',
#     'cover': '/Users/ian/Dropbox/Calibre Library/Scott Young/Ultralearning - Shortform Summary (362)/cover.jpg',
#     'formats': 'pdf',
#     'id': '362',
#     'identifiers': '',
#     'isbn': '',
#     'languages': '',
#     'library_name': 'Calibre Library',
#     'pubdate': '0101-01-01T08:00:00+08:00',
#     'publisher': 'Shortform',
#     'rating': '',
#     'series': '',
#     'series_index': '1.0',
#     'size': '760825',
#     'tags': 'shortform',
#     'timestamp': '2021-08-01T12:06:12+08:00',
#     'title': 'Ultralearning - Shortform Summary',
#     'title_sort': 'Ultralearning - Shortform Summary',
#     'uuid': 'f892b83f-8591-4575-8679-e68720c70ff7'
# }


URL = "http://127.0.0.1:23119/better-bibtex/export/collection?/1/4%20Archive/Calibre%20Library.biblatex&exportNotes=true"


def default_book():
    return {
        'keywords': '',
        'custom_mdnotes': '',
        'custom_progress': '',
        'custom_topic': '',
        'custom_metadata': ''
    }


book = default_book()
for line in urllib.request.urlopen(URL).read().decode('utf-8').splitlines():
    if line.startswith('@book{'):
        book = default_book()
    elif line.startswith('}'):
        id = book.get('calibreid')
        calibre_entry = calibredb.get(id)
        if calibre_entry is None:
            print(f'---Z-- {book["title"]}')
        else:
            del calibredb[id]
            if calibre_entry['rating'] != '':
                calibre_entry['tags'] += ',' + \
                    ('⭐️' * int(calibre_entry['rating']))
                if calibre_entry['tags'].startswith(','):
                    calibre_entry['tags'] = calibre_entry['tags'][1:]
            for zotero_key, zotero_value in book.items():
                calibre_key = ALIASES.get(zotero_key, zotero_key)
                formatter = FORMATTERS.get(zotero_key, default_formatter)
                zotero_value = formatter(zotero_value, True)
                calibre_value = formatter(
                    calibre_entry.get(calibre_key, ""), False)
                if zotero_value != calibre_value:
                    print(
                        f'±±CZ±± {book["title"]}\n<<<<<<< zotero[{zotero_key}]\n{zotero_value}\n=======\n{calibre_value}\n>>>>>>> calibre[{calibre_key}]')
    else:
        entry = parse_bib_entry(line)
        if entry:
            book[entry[0]] = entry[1]

for entry in calibredb.values():
    print(f'++C+++ {entry["title"]}')


# @book{AaronGustafson235,
#   title = {Adaptive Web Design: {{Crafting}} Rich Experiences with Progressive Enhancement},
#   author = {Gustafson, Aaron},
#   date = {2011-05},
#   volume = {1},
#   publisher = {{Easy Readers LLC}},
#   author_sort = {Gustafson, Aaron},
#   calibreid = {235},
#   cover = {/Users/ian/Dropbox/Calibre Library/Aaron Gustafson/Adaptive Web Design\_ Crafting Rich Experiences with Progressive Enhancement (235)/cover.jpg},
#   custom_progress = {100},
#   formats = {epub},
#   identifiers = {isbn:9780983589518},
#   isbn = {978-0-9835895-1-8},
#   langid = {english},
#   library_name = {Calibre Library},
#   pagetotal = {95},
#   rating = {2},
#   size = {12045634 octets},
#   title_sort = {Adaptive Web Design: Crafting Rich Experiences with Progressive Enhancement},
#   uuid = {1e18afc6-9e08-4466-b77e-928ea24543dd},
#   keywords = {tech},
#   timestamp = {2019-12-16},
#   file = {/Users/ian/Dropbox/Calibre Library/Aaron Gustafson/Adaptive Web Design_ Crafting Rich Experiences with Progressive Enhancement (235)/Adaptive Web Design_ Crafting Rich Experie - Aaron Gustafson.epub}
# }
