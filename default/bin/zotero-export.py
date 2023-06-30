#!/usr/bin/env python3

# Scan citation keys like `[@citation]` in the input files and export the bibliographic data from Zotero.

import argparse
import urllib.request
import json
import fileinput
import re

JSON_RPC_ENDPOINT = "http://localhost:23119/better-bibtex/json-rpc"
CITEKEY_RE = re.compile(r'\[@([^@\]]+(?:; @[^@\]]+)*)\]')


def export(citekeys, format):
    payload = json.dumps({"jsonrpc": "2.0", "method": "item.export", "params": [
                         citekeys, format], "id": 1}).encode("utf-8")
    request = urllib.request.Request(JSON_RPC_ENDPOINT, headers={
                                     "Content-Type": "application/json",
                                     "Accept": "application/json"
                                     }, data=payload)
    response = urllib.request.urlopen(request)
    response_json = json.loads(response.read().decode("utf-8"))
    if 'error' in response_json:
        raise Exception(response_json['error']['message'])
    return response_json["result"][2]


def main(args):
    citekeys = set()
    for line in fileinput.input(args.files, encoding="utf-8"):
        for match in CITEKEY_RE.finditer(line):
            for key in match.group(1).split("; @"):
                citekeys.add(key)

    print(export(sorted(list(citekeys)), args.format))


def parse_args(args=None):
    parser = argparse.ArgumentParser(description='zotero-export')
    parser.add_argument('-f', '--format', metavar='FORMAT',
                        choices=['bib', 'yaml', 'json'], default='yaml')
    parser.add_argument('files', metavar='FILE', nargs='*')

    return parser.parse_args(args)


if __name__ == '__main__':
    main(parse_args())
