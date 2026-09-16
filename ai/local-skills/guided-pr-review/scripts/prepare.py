#!/usr/bin/env python3
"""Capture a fixed PR diff, then render a fully covered logical chunk plan."""
import argparse
import hashlib
import html
import json
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse


def run(args, repo=None, binary=False, check=True):
    result = subprocess.run(args, cwd=repo, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if check and result.returncode:
        raise ValueError(result.stderr.decode('utf-8', errors='replace').strip() or 'Command failed')
    if not check:
        return result.returncode == 0
    return result.stdout if binary else result.stdout.decode('utf-8')


def write_json(filename, value):
    filename.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def load(filename):
    return json.loads(filename.read_text(encoding='utf-8'))


def validate_context(value, chunk_id, chunk_count):
    if not isinstance(value, list):
        raise ValueError(f'Chunk {chunk_id}: context must be an array.')
    for block in value:
        if not isinstance(block, dict) or not all(isinstance(block.get(k), str) and block[k].strip() for k in ('title', 'body')):
            raise ValueError(f'Chunk {chunk_id}: each context block needs a title and body.')
        for key in ('code', 'codeLabel'):
            if key in block and not isinstance(block[key], str):
                raise ValueError(f'Chunk {chunk_id}: context {key} must be a string.')
        links = block.get('links', [])
        if not isinstance(links, list):
            raise ValueError(f'Chunk {chunk_id}: context links must be an array.')
        for link in links:
            if not isinstance(link, dict) or not isinstance(link.get('label'), str) or not link['label'].strip():
                raise ValueError(f'Chunk {chunk_id}: context links need a label.')
            if ('url' in link) == ('chunk' in link):
                raise ValueError(f'Chunk {chunk_id}: context link needs exactly one URL or chunk.')
            if 'chunk' in link:
                if type(link['chunk']) is not int or not 1 <= link['chunk'] <= chunk_count:
                    raise ValueError(f'Chunk {chunk_id}: context links to an unknown chunk.')
            else:
                if not isinstance(link['url'], str):
                    raise ValueError(f'Chunk {chunk_id}: context URL must be a string.')
                url = urlparse(link['url'])
                if url.scheme not in ('http', 'https') or not url.hostname:
                    raise ValueError(f'Chunk {chunk_id}: context URL must be absolute HTTP(S).')
    return value


def region(template, name):
    match = re.search(f'<!--#{name}-->(.*?)<!--/{name}-->', template, re.S)
    if not match:
        raise ValueError(f'The page template is missing its {name} region.')
    return match[1].strip()


def repository_identity(url):
    if url.startswith('git@'):
        host, path = url[4:].split(':', 1)
    else:
        parsed = urlparse(url)
        host, path = parsed.hostname, parsed.path
    return str(host).lower(), path.strip('/').removesuffix('.git').lower()


def blob(repo, revision, filename):
    return run(['git', 'show', revision + ':' + filename], repo, binary=True)


def parse_rows(patch, old_bytes, new_bytes, filename):
    old_lines = old_bytes.decode('utf-8').split('\n')
    new_lines = new_bytes.decode('utf-8').split('\n')
    rows, hunks = [], []
    old = new = None
    hunk = -1
    for line in patch.split('\n'):
        match = re.match(r'@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', line)
        if match:
            old, new = int(match[1]), int(match[3])
            hunk += 1
            hunks.append({'index': hunk, 'header': line, 'oldStart': old, 'newStart': new})
            rows.append({'kind': 'hunk', 'text': line, 'hunk': hunk})
        elif old is not None and line[:1] in ('+', '-', ' '):
            kind = {'+': 'add', '-': 'del', ' ': 'context'}[line[0]]
            text = line[1:]
            row = {'kind': kind, 'text': text, 'old': None if kind == 'add' else old,
                   'new': None if kind == 'del' else new, 'hunk': hunk}
            if kind != 'add':
                if old_lines[old - 1] != text:
                    raise ValueError(f'Base line mismatch: {filename}:{old}')
                old += 1
            if kind != 'del':
                if new_lines[new - 1] != text:
                    raise ValueError(f'Head line mismatch: {filename}:{new}')
                new += 1
            rows.append(row)
        elif line and not line.startswith(('diff --git ', 'index ', '--- ', '+++ ')):
            rows.append({'kind': 'meta', 'text': line, 'hunk': hunk if hunk >= 0 else None})
    for entry in hunks:
        entry['additions'] = sum(r['kind'] == 'add' and r.get('hunk') == entry['index'] for r in rows)
        entry['deletions'] = sum(r['kind'] == 'del' and r.get('hunk') == entry['index'] for r in rows)
    return rows, hunks


def snapshot(args):
    repo, directory = args.repo.resolve(), args.out.resolve()
    if (directory / 'snapshot.json').exists():
        raise ValueError('A snapshot already exists here. Reuse it or choose a new output directory.')
    if args.metadata:
        meta = load(args.metadata)
    else:
        fields = 'number,title,url,baseRefName,baseRefOid,headRefName,headRefOid,state'
        meta = json.loads(run(['gh', 'pr', 'view', args.pr, '--json', fields], repo))
    parsed = urlparse(meta['url'])
    match = re.fullmatch(r'/([^/]+)/([^/]+)/pull/(\d+)/?', parsed.path)
    if parsed.scheme != 'https' or not match:
        raise ValueError('Expected a GitHub PR URL in metadata.url')
    repository_url = f'https://{parsed.netloc}/{match[1]}/{match[2]}'
    for key in ('headRefOid', 'baseRefOid'):
        if not re.fullmatch(r'[0-9a-f]{40,64}', meta[key]):
            raise ValueError('Invalid commit ID in ' + key)
        if not run(['git', 'cat-file', '-e', meta[key] + '^{commit}'], repo, check=False):
            if args.no_fetch:
                raise ValueError('Missing commit ' + meta[key] + '; fetch it or omit --no-fetch')
            remote_url = run(['git', 'remote', 'get-url', args.remote], repo).strip()
            if repository_identity(remote_url) != repository_identity(repository_url):
                raise ValueError('Selected remote does not match the PR repository; pass --remote NAME')
            run(['git', 'fetch', '--no-tags', args.remote, meta[key]], repo)
    base = run(['git', 'merge-base', meta['baseRefOid'], meta['headRefOid']], repo).strip()
    head = meta['headRefOid']
    names = run(['git', 'diff', '--no-renames', '--name-status', '-z', base, head], repo, binary=True).decode('utf-8').split('\0')
    files = []
    for i in range(0, len(names) - 1, 2):
        status, filename = names[i:i + 2]
        old_bytes = b'' if status == 'A' else blob(repo, base, filename)
        new_bytes = b'' if status == 'D' else blob(repo, head, filename)
        command = ['git', 'diff', '--no-ext-diff', '--no-textconv', '--no-color', '--no-renames', '--unified=3', base, head, '--', filename]
        raw_patch = run(command, repo, binary=True)
        binary = b'Binary files ' in raw_patch or b'GIT binary patch' in raw_patch
        recovered = False
        try:
            old_bytes.decode('utf-8'); new_bytes.decode('utf-8')
            patch = raw_patch.decode('utf-8')
            if binary:
                patch = run(command[:2] + ['--text'] + command[2:], repo)
                recovered = True
            rows, hunks = parse_rows(patch, old_bytes, new_bytes, filename)
        except UnicodeDecodeError:
            rows = [{'kind': 'meta', 'text': 'Binary or non-UTF-8 content changed; inspect the source asset separately.', 'hunk': None}]
            hunks = []
        files.append({'path': filename, 'short': filename, 'status': status, 'deleted': status == 'D',
                      'binary': binary, 'recovered': recovered, 'rows': rows, 'hunks': hunks,
                      'additions': sum(r['kind'] == 'add' for r in rows),
                      'deletions': sum(r['kind'] == 'del' for r in rows)})
    if not files:
        raise ValueError('This snapshot has no changed files.')
    meta.update({'mergeBaseOid': base, 'repositoryUrl': repository_url, 'localRepository': str(repo)})
    directory.mkdir(parents=True, exist_ok=True)
    write_json(directory / 'metadata.json', meta)
    write_json(directory / 'snapshot.json', {'metadata': meta, 'files': files})
    write_json(directory / 'inventory.json', [{k: v for k, v in f.items() if k != 'rows'} for f in files])
    print(f"Captured {len(files)} changed paths at {head[:10]}, compared with {base[:10]}.")
    print(directory / 'inventory.json')


def build(args):
    directory = args.directory.resolve()
    captured, plan = load(directory / 'snapshot.json'), load(args.plan)
    meta = captured['metadata']
    files = {f['path']: f for f in captured['files']}
    if not isinstance(plan, list) or not plan:
        raise ValueError('Plan must be a nonempty array.')
    expected = {(f['path'], h['index']) for f in files.values() for h in f['hunks']}
    expected.update((f['path'], None) for f in files.values() if not f['hunks'])
    seen, chunks = set(), []
    for chunk_id, entry in enumerate(plan, 1):
        if not all(isinstance(entry.get(k), str) and entry[k].strip() for k in ('title', 'objective')):
            raise ValueError(f'Chunk {chunk_id} needs a title and objective.')
        if not isinstance(entry.get('focus', []), list) or not all(isinstance(x, str) for x in entry.get('focus', [])):
            raise ValueError(f'Chunk {chunk_id}: focus must be a string array.')
        context = validate_context(entry.get('context', []), chunk_id, len(plan))
        selected_files, paths_in_chunk = [], set()
        for selector in entry['files']:
            path = selector if isinstance(selector, str) else selector['path']
            if path not in files:
                raise ValueError('Unknown path in plan: ' + path)
            if path in paths_in_chunk:
                raise ValueError('Use one file selector per path in a chunk: ' + path)
            paths_in_chunk.add(path)
            source = files[path]
            all_hunks = {h['index'] for h in source['hunks']}
            selected = all_hunks if isinstance(selector, str) else set(selector['hunks'])
            if not isinstance(selector, str) and (not selected or not selected <= all_hunks):
                raise ValueError('Invalid hunk selection for ' + path)
            keys = {(path, h) for h in selected} if all_hunks else {(path, None)}
            if seen & keys:
                raise ValueError('Duplicate diff coverage for ' + path)
            seen.update(keys)
            file = {k: v for k, v in source.items() if k not in ('hunks', 'rows')}
            file['rows'] = [r for r in source['rows'] if r.get('hunk') is None or r.get('hunk') in selected]
            file['additions'] = sum(r['kind'] == 'add' for r in file['rows'])
            file['deletions'] = sum(r['kind'] == 'del' for r in file['rows'])
            selected_files.append(file)
        if not selected_files:
            raise ValueError(f'Chunk {chunk_id} has no files.')
        chunks.append({'id': chunk_id, 'title': entry['title'], 'objective': entry['objective'],
                       'context': context, 'focus': entry.get('focus', []), 'files': selected_files,
                       'additions': sum(f['additions'] for f in selected_files),
                       'deletions': sum(f['deletions'] for f in selected_files)})
    if seen != expected:
        missing = sorted(f'{p}:hunk {h}' for p, h in expected - seen)
        raise ValueError('Unassigned changes: ' + ', '.join(missing))
    # Explanatory context does not change file/line anchors. Preserve identities
    # from older plans and saved notes when only this supporting text changes.
    anchor_plan = [{key: value for key, value in entry.items() if key != 'context'} for entry in plan]
    identity = json.dumps([meta['url'], meta['mergeBaseOid'], meta['headRefOid'], anchor_plan], sort_keys=True).encode()
    review_id = hashlib.sha256(identity).hexdigest()[:24]
    if (directory / 'review-data.json').exists() and load(directory / 'review-data.json')['reviewId'] != review_id:
        raise ValueError('The existing review has a different chunk plan. Use a new directory to preserve annotation anchors.')
    data = {'reviewId': review_id, 'number': meta['number'], 'label': f"PR #{meta['number']}",
            'title': meta['title'], 'url': meta['url'], 'repositoryUrl': meta['repositoryUrl'],
            'head': meta['headRefOid'], 'base': meta['mergeBaseOid'], 'chunks': chunks}
    template = (Path(__file__).resolve().parent.parent / 'assets' / 'review.html').read_text(encoding='utf-8')
    # A host that wraps the page in its own document skeleton (a native artifact)
    # receives the marked head and body regions only, never a second <html>.
    fragment = '\n'.join(region(template, name) for name in ('page-head', 'page-body'))
    title = html.escape(f"{data['label']} guided review", quote=False)
    for filename, source, surface in [('review.html', template, 'local'), ('review-artifact.html', fragment, 'artifact')]:
        page_data = {**data, 'surface': surface}
        payload = json.dumps(page_data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
        (directory / filename).write_text(source.replace('__TITLE__', title).replace('__DATA__', payload), encoding='utf-8')
    write_json(directory / 'review-data.json', data)
    write_json(directory / 'coverage.json', {'complete': True, 'changedFiles': len(files), 'chunks': len(chunks),
              'hunksAndNonTextChanges': len(expected), 'additions': sum(c['additions'] for c in chunks),
              'deletions': sum(c['deletions'] for c in chunks), 'head': data['head'], 'base': data['base']})
    print(f'Built {len(chunks)} chunks covering all {len(files)} changed paths exactly once.')
    print(directory / 'review.html')
    print(directory / 'review-artifact.html')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    capture = sub.add_parser('snapshot', help='Capture immutable PR data without checking out its branch')
    capture.add_argument('--repo', type=Path, required=True)
    source = capture.add_mutually_exclusive_group(required=True)
    source.add_argument('--pr', help='GitHub pull request URL')
    source.add_argument('--metadata', type=Path, help='Previously captured gh pr view JSON (offline input)')
    capture.add_argument('--out', type=Path, required=True)
    capture.add_argument('--remote', default='origin')
    capture.add_argument('--no-fetch', action='store_true')
    capture.set_defaults(handler=snapshot)
    render = sub.add_parser('build', help='Validate the chunk plan and generate the review page')
    render.add_argument('--directory', type=Path, required=True)
    render.add_argument('--plan', type=Path, required=True)
    render.set_defaults(handler=build)
    args = parser.parse_args()
    try:
        args.handler(args)
    except (ValueError, KeyError, TypeError, OSError, IndexError) as error:
        parser.exit(1, f'Error: {error}\n')


if __name__ == '__main__':
    main()
