#!/usr/bin/env python3

import fileinput
import re
from dataclasses import dataclass, field

ANNOTATION_RE = re.compile(r"""
        (\#+\ )?
        “(.*)”
        (\ \(\[.*\]\(.*\)\))+
        (?:\ (.*))?
""", re.VERBOSE)
TAG_RE = re.compile(r"\.([a-zA-Z0-9_-]+)\b")
QUOTED_RE = re.compile(r"\\([\\\[\]*_-`])")
ACTION_RE = re.compile(r"#([ch])([1-9])(?:\s|$)")


@dataclass
class State:
    action_type: str = ''
    annotations: list[str] = field(default_factory=list)
    links: str = ''
    note: str = ''
    lines: list[str] = field(default_factory=list)

    def is_active(self):
        return len(self.annotations) > 0

    def clear(self):
        self.annotations = []
        self.links = ''
        self.note = ''
        self.lines = []

    def flush(self):
        if len(self.annotations) > 0:
            print(f'- {" ".join(self.annotations)}{self.links}')
            note = self.note
            if len(note) > 0:
                print(f'    {unquote(note.strip())}')
                if note.startswith('#') and note.rstrip("\r\n").endswith("  "):
                    print()

            lines = self.lines
            self.clear()

            for line in lines:
                process(line, self)


def unquote(text):
    return QUOTED_RE.sub(r'\1', text)


def process_heading_action(match_groups, heading_level, state):
    annotation, links, note = match_groups
    state.flush()
    print(f'{"#" * (1 + heading_level)} {annotation}')
    print(links.strip())
    print()
    if note.strip() != '':
        print(note.strip())
        print()


def process_concatenation_action(match_groups, index, state):
    annotation, links, note = match_groups
    note = note or ''
    if index == 1:
        state.flush()
        state.annotations = [annotation]
        state.links = links
        state.note = note
        state.lines = []
    else:
        state.annotations.append(annotation)
        if note.strip() != '':
            state.lines.append(note)


def process_match(match, state):
    heading_marks, annotation, links, note = match.groups()
    heading_marks = heading_marks or ''
    annotation = unquote(annotation)
    note = note or ''
    if note.startswith('.'):
        note = TAG_RE.sub(r'#\1', note)

    action_type = None
    action_arg = ''
    if heading_marks != '':
        action_type = 'h'
        action_arg = len(heading_marks) - 1
    else:
        action_match = ACTION_RE.match(note)
        if action_match is not None:
            action_type, action_arg = action_match.groups()

    if action_type is not None:
        state.action_type = action_type
        action_arg = int(action_arg)
        match_groups = (annotation, links, note[3:].lstrip())
        if action_type == 'h':
            process_heading_action(match_groups, action_arg, state)
        else:
            process_concatenation_action(match_groups, action_arg, state)
    else:
        state.action_type = ''
        state.flush()
        print(f'- {annotation}{links}')
        if len(note) > 0:
            print(f'    {unquote(note.strip())}')
            if note.startswith('#') and note.rstrip("\r\n").endswith("  "):
                print()


def process(line, state):
    match = ANNOTATION_RE.match(line)
    if match is not None:
        process_match(match, state)
    elif state.is_active():
        state.lines.append(line)
    elif line.rstrip("\r\n") == '':
        print()
    elif state.action_type == 'h':
        print(unquote(line.rstrip()))
    else:
        print(f'    {unquote(line.rstrip())}')


if __name__ == '__main__':
    inputs = fileinput.input()
    print(next(inputs))

    state = State()
    for line in inputs:
        process(line, state)
    state.flush()
