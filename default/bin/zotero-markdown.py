#!/usr/bin/env python3

# ruff: noqa: E501

import argparse
import urllib.request
import json
import fileinput
import re
import copy
from collections import defaultdict

JSON_RPC_ENDPOINT = "http://localhost:23119/better-bibtex/json-rpc"
CITEKEY_RE = re.compile(r'\[@([^@\]]+(?:; @[^@\]]+)*)\]')


def format_author(author):
    if 'literal' in author:
        return author['literal']
    return author['family']


def get_authors(csljson):
    return [format_author(a) for a in csljson["author"]]


def get_year(csljson):
    return csljson["issued"]["date-parts"][0][0]


def mla_resolve_conflicts(citations, conflicts):
    for citation, items in conflicts.items():
        if len(items) > 1:
            del citations[citation]
            dup_items = copy.deepcopy(items)

            for item in dup_items:
                for author in item['author']:
                    if 'given' in author and 'family' in author and 'literal' not in author:
                        author['literal'] = f'{author["given"][0]}. {author["family"]}'

                new_citation = mla_citation(item)
                if new_citation != citation and new_citation not in conflicts:
                    citations[item['id']] = new_citation
                    conflicts[new_citation].append(item)
                else:
                    # try title
                    title_words = item['title'].split()
                    fixed = False
                    for used_words in range(3, len(title_words)):
                        last_word = title_words[used_words - 1]
                        if last_word[0].isupper():
                            new_citation = "*" + \
                                " ".join(title_words[0:used_words]) + "*"
                            if new_citation != citation and new_citation not in conflicts:
                                citations[item['id']] = new_citation
                                conflicts[new_citation].append(item)
                                fixed = True
                                break

                    if not fixed:
                        new_citation = "*" + item["title"] + "*"
                        if new_citation != citation and new_citation not in conflicts:
                            citations[item['id']] = new_citation
                            conflicts[new_citation].append(item)
                        else:
                            raise Exception(
                                f"Unable to resolve conflict for {item['id']}")


def index_to_alphabet(index):
    return chr(index + ord('a'))


def apa_resolve_conflicts(citations, conflicts):
    for citation, items in conflicts.items():
        if len(items) > 1:
            del citations[citation]
            for index, item in enumerate(items):
                citations[item['id']] = citation + index_to_alphabet(index)


def resolve_conflicts(citations, conflicts, csl):
    if csl == 'modern-language-association':
        return mla_resolve_conflicts(citations, conflicts)
    else:
        return apa_resolve_conflicts(citations, conflicts)


def apa_citation(csljson):
    # (Weyl et al., 2022; 嘉吉 & 鹤义, 2022)
    authors = get_authors(csljson)
    if len(authors) == 1:
        author_part = authors[0]
    elif len(authors) == 2:
        author_part = " & ".join(authors)
    else:
        author_part = authors[0] + " et al."

    return ", ".join([author_part, str(get_year(csljson))])


def mla_citation(csljson):
    # (宋嘉吉 and 任鹤义; Weyl et al.)
    authors = get_authors(csljson)
    if len(authors) == 1:
        return authors[0]
    elif len(authors) == 2:
        return " and ".join(authors)
    else:
        return authors[0] + " et al."


def csl_citation(csljson, csl):
    if csl == 'modern-language-association':
        return mla_citation(csljson)
    else:
        return apa_citation(csljson)


def build_citations(citekeys, citations, csl):
    payload = json.dumps({"jsonrpc": "2.0", "method": "item.export", "params": [
                         citekeys, 'json'], "id": 1}).encode("utf-8")
    request = urllib.request.Request(JSON_RPC_ENDPOINT, headers={
                                     "Content-Type": "application/json", "Accept": "application/json"}, data=payload)
    response = urllib.request.urlopen(request)
    response_json = json.loads(response.read().decode("utf-8"))
    if 'error' in response_json:
        raise Exception(response_json['error']['message'])

    conflicts = defaultdict(list)
    for item in json.loads(response_json["result"][2]):
        citation = csl_citation(item, csl)
        citations[item["id"]] = citation
        conflicts[citation].append(item)

    resolve_conflicts(citations, conflicts, csl)


def build_bibliography(citekey, csl):
    payload = json.dumps({"jsonrpc": "2.0", "method": "item.bibliography", "params": [
                         [citekey],  {"id": csl, "contentType": "text"}], "id": 1}).encode("utf-8")
    request = urllib.request.Request(JSON_RPC_ENDPOINT, headers={
                                     "Content-Type": "application/json", "Accept": "application/json"}, data=payload)
    response = urllib.request.urlopen(request)
    response_json = json.loads(response.read().decode("utf-8"))
    if 'error' in response_json:
        raise Exception(response_json['error']['message'])
    return response_json["result"].strip()


def build_references(citekeys, csl):
    return "\n".join(map(lambda key: f'[^{key}]: {build_bibliography(key, csl)}', citekeys))


def main(args):
    citekeys = set()
    citations = dict()

    def collect_citekeys(match):
        for key in match.group(1).split("; @"):
            citekeys.add(key)
        return match.group(0)

    def repl(match):
        keys = match.group(1).split("; @")
        inner = "; ".join(f'{citations[key]}[^{key}]' for key in keys)
        return f'({inner})'

    lines = []
    for line in fileinput.input(args.files, encoding="utf-8"):
        lines.append(line)
        if line.startswith('## References'):
            break
        CITEKEY_RE.sub(collect_citekeys, line)

    build_citations(list(citekeys), citations, args.csl)

    for line in lines:
        print(CITEKEY_RE.sub(repl, line), end='')

    print('')
    print(build_references(sorted(list(citekeys)), args.csl))


def parse_args(args=None):
    parser = argparse.ArgumentParser(description='zotero-markdown')
    parser.add_argument('--csl', metavar='ID',
                        choices=['apa', 'modern-language-association'], default='apa')
    parser.add_argument('files', metavar='FILE', nargs='*')

    return parser.parse_args(args)


if __name__ == '__main__':
    main(parse_args())
