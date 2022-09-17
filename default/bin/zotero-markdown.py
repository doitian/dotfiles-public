#!/usr/bin/env python3

import argparse
import urllib.request
import json
import fileinput
import re

JSON_RPC_ENDPOINT = "http://localhost:23119/better-bibtex/json-rpc"
CITEKEY_RE = re.compile(r'\[@([^@\]]+(?:; @[^@\]]+)*)\]')


def export(citekey, csl):
    payload = json.dumps({"jsonrpc": "2.0", "method": "item.bibliography", "params": [
                         [citekey],  {"id": csl, "contentType": "text"}], "id": 1}).encode("utf-8")
    request = urllib.request.Request(JSON_RPC_ENDPOINT, headers={
                                     "Content-Type": "application/json", "Accept": "application/json"}, data=payload)
    response = urllib.request.urlopen(request)
    response_json = json.loads(response.read().decode("utf-8"))
    if 'error' in response_json:
        raise Exception(response_json['error']['message'])
    return response_json["result"].strip()


def bibliography(citekeys, csl):
    return "\n".join(map(lambda key: f'[^{key}]: {export(key, csl)}', citekeys))


def main(args):
    citekeys = set()

    def repl(match):
        keys = match.group(1).split("; @")
        for key in keys:
            citekeys.add(key)
        inner = "; ".join([f'@{key}[^{key}]' for key in keys])
        return f'({inner})'

    for line in fileinput.input(args.files, encoding="utf-8"):
        if line.startswith('## References'):
            print(line, end='')
            break
        print(CITEKEY_RE.sub(repl, line), end='')

    print('')
    print(bibliography(sorted(list(citekeys)), args.csl))


def parse_args(args=None):
    parser = argparse.ArgumentParser(description='zotero-markdown')
    parser.add_argument('--csl', metavar='ID',
                        choices=['apa', 'modern-language-association'], default='apa')
    parser.add_argument('files', metavar='FILE', nargs='*')

    return parser.parse_args(args)


if __name__ == '__main__':
    main(parse_args())
