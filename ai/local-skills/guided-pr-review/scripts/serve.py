#!/usr/bin/env python3
"""Serve one generated review on loopback and persist its line annotations."""
import argparse
import json
import os
import re
import secrets
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, required=True)
    parser.add_argument('--port', type=int, default=0, help='Default: choose an available port')
    args = parser.parse_args()
    root = args.directory.resolve()
    data = json.loads((root / 'review-data.json').read_text(encoding='utf-8'))
    page = (root / 'review.html').read_text(encoding='utf-8')
    record = root / 'review-server.json'
    state_file = root / 'review-notes.json'
    if record.exists():
        try:
            old = json.loads(record.read_text())
            if re.fullmatch(r'http://127\.0\.0\.1:\d+/', old['url']):
                with urlopen(old['url'] + 'health', timeout=1) as response:
                    health = json.load(response)
                if health.get('reviewId') == data['reviewId']:
                    print('Already running: ' + old['url'], flush=True)
                    return
        except (OSError, ValueError, KeyError):
            pass
    token = secrets.token_urlsafe(24)
    lock = threading.Lock()
    known_files = {(chunk['id'], file['path']): file for chunk in data['chunks'] for file in chunk['files']}

    def validate(state):
        if not isinstance(state, dict) or state.get('reviewId') != data['reviewId'] or state.get('head') != data['head']:
            raise ValueError('Wrong review snapshot')
        if type(state.get('current')) is not int or not 1 <= state['current'] <= len(data['chunks']):
            raise ValueError('Invalid chunk')
        if not isinstance(state.get('reviewed'), list) or not all(type(i) is int and 1 <= i <= len(data['chunks']) for i in state['reviewed']):
            raise ValueError('Invalid reviewed state')
        if not isinstance(state.get('drafts'), dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in state['drafts'].items()):
            raise ValueError('Invalid drafts')
        if not isinstance(state.get('notes'), list):
            raise ValueError('Invalid notes')
        for note in state['notes']:
            if not isinstance(note, dict) or not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', str(note.get('id', ''))):
                raise ValueError('Invalid note ID')
            file = known_files.get((note.get('chunk'), note.get('file')))
            if not file or not isinstance(note.get('text'), str) or len(note['text']) > 50000:
                raise ValueError('Invalid note')
            side = note.get('side')
            if side == 'file':
                if note.get('line') is not None:
                    raise ValueError('Whole-file note has a line')
            elif side not in ('old', 'new') or type(note.get('line')) is not int or not any(row.get(side) == note['line'] for row in file['rows']):
                raise ValueError('Note line is not in this diff')

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def reply(self, status, body, content_type='application/json'):
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path in ('/', '/review.html'):
                self.reply(200, page.replace('__SAVE_TOKEN__', token, 1).encode(), 'text/html; charset=utf-8')
            elif self.path == '/health':
                self.reply(200, json.dumps({'reviewId': data['reviewId']}).encode())
            elif self.path == '/state' and self.headers.get('X-Review-Token') == token:
                with lock:
                    raw = state_file.read_bytes() if state_file.exists() else b'null'
                self.reply(200, raw)
            else:
                self.reply(404, b'{}')

        def do_POST(self):
            if self.path != '/state' or self.headers.get('X-Review-Token') != token:
                return self.reply(403, b'{}')
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 2_000_000:
                    raise ValueError('State is too large')
                state = json.loads(self.rfile.read(size))
                validate(state)
                with lock:
                    temp = root / 'review-notes.json.tmp'
                    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
                    os.replace(temp, state_file)
                self.reply(200, b'{"saved":true}')
            except (ValueError, TypeError, KeyError):
                self.reply(400, b'{"saved":false}')
            except OSError:
                self.reply(500, b'{"saved":false}')

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    url = f'http://127.0.0.1:{server.server_port}/'
    record.write_text(json.dumps({'url': url, 'pid': os.getpid(), 'reviewId': data['reviewId']}), encoding='utf-8')
    print(url, flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
