#!/usr/bin/env python3

import os
import re
import sys
import subprocess
import json
from collections import namedtuple, OrderedDict
import requests
from requests.auth import HTTPBasicAuth


def _str(s):
    if sys.version_info >= (3, 0):
        return s.decode('utf-8')
    return s


os.makedirs(".git/changes", exist_ok=True)

if 'GITHUB_CHANGELOG_REPO' in os.environ:
    repo = os.environ['GITHUB_CHANGELOG_REPO']
elif os.path.exists(".git/changes/repo"):
    with open(".git/changes/repo") as repo_file:
        repo = repo_file.read().strip()
else:
    remote_url = _str(subprocess.check_output(
        ["git", "remote", "get-url", "origin"])).strip()
    if remote_url.endswith('.git'):
        remote_url = remote_url[:-4]
    repo = '/'.join(remote_url.rsplit(':', 2)[-1].rsplit('/', 3)[-2:])

if len(sys.argv) > 1:
    since = sys.argv[1]
else:
    tag_rev = _str(subprocess.check_output(
        ['git', 'rev-list', '--tags', '--max-count=1']).strip())
    since = _str(subprocess.check_output(
        ['git', 'describe', '--tags', tag_rev]).strip())

logs = _str(subprocess.check_output(
    ['git', 'log', '--reverse', '--merges', '--pretty=tformat:%s', '{}...HEAD'.format(since)]))

PR_NUMBER_RE = re.compile(r'^Merge pull request #(\d+) from')
BORS_PR_NUMBER_RE = re.compile(r'^Merge #(\d+.*)')
PR_TITLE_RE = re.compile(
    r'(?:\[[^]]+\]\s*)*(?:(\w+)(?:\(([^\)]+)\))?:\s*)?(.*)')

Change = namedtuple('Change', ['scope', 'module', 'title', 'text'])

changes = OrderedDict()
for scope in ['feat', 'fix']:
    changes[scope] = []

SCOPE_MAPPING = {
    'bug': 'fix',
    'bugs': 'fix',
    'chore': False,
    'docs': False,
    'feature': 'feat',
    'perf': 'refactor',
    'test': False,
}

SCOPE_TITLE = {
    'feat': 'Features',
    'fix': 'Bug Fixes',
    'refactor': 'Improvements',
}

auth = HTTPBasicAuth('', os.environ['GITHUB_TOKEN'])

for line in logs.splitlines():
    pr_numbers = []

    pr_number_match = PR_NUMBER_RE.match(line)
    if pr_number_match:
        pr_numbers.append(pr_number_match.group(1))
    pr_number_match = BORS_PR_NUMBER_RE.match(line)
    if pr_number_match:
        for pr_number in pr_number_match.group(1).split(" #"):
            pr_numbers.append(pr_number)

    for pr_number in pr_numbers:
        cache_file = ".git/changes/{}.json".format(pr_number)
        if os.path.exists(cache_file):
            print("read pr #" + pr_number, file=sys.stderr)
            with open(cache_file) as fd:
                pr = json.load(fd)
        else:
            print("get pr #" + pr_number, file=sys.stderr)
            api_endpoint = 'https://api.github.com/repos/{}/pulls/{}'.format(
                repo, pr_number)
            pr_resp = requests.get(api_endpoint, auth=auth)
            if pr_resp.status_code == 404:
                print("PR {} not found".format(pr_number), file=sys.stderr)
                continue

            pr = pr_resp.json()
            if 'message' in pr:
                print(pr['message'], file=sys.stderr)
                sys.exit(1)

            with open(cache_file, 'w') as fd:
                json.dump(pr, fd)

        scope, module, message = PR_TITLE_RE.match(pr['title']).groups()
        if not scope:
            if message.lower().startswith("fix ") or message.lower().startswith("fixes "):
                scope = 'fix'
            else:
                scope = 'misc'
        scope = SCOPE_MAPPING.get(scope, scope)
        if not scope:
            continue

        user = pr['user']['login']
        message = message.strip()
        message = message[0].upper() + message[1:]
        if module:
            title = '* #{0} **{1}:** {2} (@{3})'.format(pr_number,
                                                        module, message, user)
        else:
            title = '* #{0}: {1} (@{2})'.format(pr_number, message, user)

        change = Change(scope, module, title, [])
        Change = namedtuple('Change', ['scope', 'module', 'title', 'text'])

        body = pr['body'] or ""
        if '```release-note' in body:
            # ```release-note
            # None: Exclude this PR from the release note.
            # Title Only: Include only the PR title in the release note.
            # Note: Add a note under the PR title in the release note.
            # ```
            body = body.split('```release-note')[1].split('```')[0].strip()
            if body.startswith('None: '):
                continue
            elif body.startswith('Title Only: '):
                body = ''
            elif body.startswith('Note: '):
                body = body[6:]
                if body.strip() == 'Add a note under the PR title in the release note.':
                    body = ''

        labels = [label['name'] for label in pr['labels']]
        is_breaking = "breaking change" in labels or any(
            label.startswith('b:') for label in labels)
        if is_breaking:
            breaking_banner = ", ".join(
                label for label in labels if label.startswith('b:'))
            if breaking_banner != "" or "breaking change" not in body.lower():
                if breaking_banner == "":
                    breaking_banner = "This is a breaking change"
                else:
                    breaking_banner = "This is a breaking change: " + breaking_banner
            if body == "":
                body = breaking_banner
            elif breaking_banner != "":
                body = breaking_banner + "\n\n" + body

        if scope not in changes:
            changes[scope] = []

        changes[scope].append(Change(scope, module, title, body))

if os.path.exists(".git/changes/extra.json"):
    with open(".git/changes/extra.json") as fin:
        extra = json.load(fin)
    for (scope, extra_changes) in extra.items():
        if scope not in changes:
            changes[scope] = []

        for change in extra_changes:
            changes[scope].append(
                Change(scope, change.get('module'), change['title'], change.get('text', '')))

out = open(".git/changes/out.md", "w")
for scope, changes in changes.items():
    if len(changes) == 0:
        continue

    scope_title = SCOPE_TITLE.get(scope, scope.title())
    print('### {}'.format(scope_title), file=out)
    print('', file=out)

    for change in changes:
        print(change.title, file=out)
        if change.text != '':
            print('', file=out)
            for line in change.text.splitlines():
                print('    ' + line, file=out)
            print('', file=out)

    print('', file=out)
