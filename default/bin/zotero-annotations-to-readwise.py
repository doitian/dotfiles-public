#!/usr/bin/env python3

import fileinput
import re
import sys
import csv
from dataclasses import dataclass, field

ANNOTATION_RE = re.compile(r"""
        (?:\#+\ )?
        “(.*)”
        (\ \(\[.*\]\(.*\)\))+
        (?:\ (.*))?
""", re.VERBOSE)
QUOTED_RE = re.compile(r"\\([\\\[\]*_-`])")
LINK_RE = re.compile(r"\(\[.*?\]\((.*?)\)\)")
PAGE_RE = re.compile(r"page=([0-9]+)")


@dataclass
class State:
    highlight: str = ''
    page: int = -1
    article_link: str = ''
    pdf_link: str = ''
    note: str = ''
    lines: list[str] = field(default_factory=list)

    def __init__(self, author, title, csv_writer):
        self.author = author
        self.title = title
        self.csv_writer = csv_writer
        self.clear()

    def is_active(self):
        return self.highlight != ''

    def clear(self):
        self.highlight = ''
        self.note = ''
        self.link = ''
        self.page = -1
        self.lines = []

    def process_match(self, match):
        if self.is_active():
            self.flush()

        highlight, raw_links, note = match.groups()
        self.highlight = highlight
        self.note = note or ''
        self.lines = []

        links = LINK_RE.findall(raw_links)
        self.article_link = links[0]
        self.pdf_link = f'([pdf →]({links[1]}))'
        page_match = PAGE_RE.search(self.pdf_link)
        self.page = int(page_match.group(1)) if page_match is not None else 0

    def flush(self):
        note = self.combined_note()
        if self.note.startswith('.h'):
            highlight = self.highlight
        else:
            highlight = append_pdf_link(self.highlight, self.pdf_link)

        # Highlight, Title, Author, URL, Note, Location
        csv_writer.writerow([
            highlight,
            self.title,
            self.author,
            self.article_link,
            note,
            str(self.page)
        ])
        self.clear()

    def combined_note(self):
        unquoted_note = unquote(self.note)
        joined_lines = ''.join(squash_empty_lines(self.lines))
        return '\n\n'.join(filter(lambda t: t != '', [unquoted_note, joined_lines])).rstrip()


def append_pdf_link(text, pdf_link):
    if text == '':
        return pdf_link
    elif '\n' in text:
        return f'{text.rstrip()}\n\n{pdf_link}'
    else:
        return f'{text} {pdf_link}'


def squash_empty_lines(lines):
    squashed = []

    for line in lines:
        if len(squashed) == 0 or not is_empty_line(line) or not is_empty_line(squashed[-1]):
            squashed.append(line.rstrip('\r\n') + '\n')

    if len(squashed) > 0 and is_empty_line(squashed[0]):
        squashed = squashed[1:]
    if len(squashed) > 0 and is_empty_line(squashed[-1]):
        squashed.pop()

    return squashed


def is_empty_line(line):
    return line.rstrip('\r\n') == ''


def unquote(text):
    return QUOTED_RE.sub(r'\1', text)


def process(line, state):
    match = ANNOTATION_RE.match(line)
    if match is not None:
        state.process_match(match)
    elif state.is_active():
        state.lines.append(line)


if __name__ == '__main__':
    inputs = fileinput.input()
    author, title = next(inputs)[2:].strip().split(' - ', maxsplit=1)

    csv_writer = csv.writer(sys.stdout)
    csv_writer.writerow(
        ['Highlight', 'Title', 'Author', 'URL', 'Note', 'Location'])
    state = State(author, title, csv_writer)
    for line in inputs:
        process(line, state)
    state.flush()
