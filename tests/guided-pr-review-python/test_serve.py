import concurrent.futures
import copy
import json
import re
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from helpers import SKILL, write_json


class ServeTests(unittest.TestCase):
    def setUp(self):
        output = tempfile.TemporaryDirectory(prefix='review-serve-test-')
        self.addCleanup(output.cleanup)
        self.out = Path(output.name)
        self.data = {'reviewId': 'test-review', 'head': 'a' * 40,
                     'chunks': [{'id': 1, 'files': [{'path': 'src/one.js', 'rows': [
                         {'kind': 'del', 'old': 2, 'new': None},
                         {'kind': 'add', 'old': None, 'new': 3}]}]},
                                {'id': 2, 'files': [{'path': 'mode.sh', 'rows': []}]}]}
        write_json(self.out / 'review-data.json', self.data)
        (self.out / 'review.html').write_text('<html><meta name="review-token" content="__SAVE_TOKEN__"></html>',
                                            encoding='utf-8', newline='\n')
        self.process = None
        self.addCleanup(self.stop)
        self.start()

    def start(self):
        self.process = subprocess.Popen([sys.executable, '-B', str(SKILL / 'scripts/serve.py'),
                                         '--directory', str(self.out)], stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE, text=True)
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                self.fail('Server exited during startup: ' + self.process.stderr.read())
            try:
                record = json.loads((self.out / 'review-server.json').read_text())
                if record['pid'] == self.process.pid:
                    self.url = record['url']
                    with urlopen(self.url + 'health', timeout=0.2) as response:
                        if json.load(response)['reviewId'] == self.data['reviewId']:
                            break
            except (OSError, ValueError, URLError):
                pass
            time.sleep(0.02)
        else:
            self.fail('Server did not become ready')
        status, _, html = self.request('/')
        self.assertEqual(status, 200)
        self.token = re.search(r'content="([A-Za-z0-9_-]+)"', html.decode())[1]

    def stop(self):
        if self.process is not None:
            self.process.terminate()
            try:
                self.process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait(timeout=3)
            self.process.stdout.close()
            self.process.stderr.close()
            self.process = None

    def request(self, path, body=None, *, token=None, headers=None):
        request_headers = dict(headers or {})
        if token is not None:
            request_headers['X-Review-Token'] = token
        request = Request(self.url.rstrip('/') + path, data=body, headers=request_headers)
        try:
            response = urlopen(request, timeout=3)
        except HTTPError as error:
            response = error
        with response:
            return response.status, response.headers, response.read()

    def state(self):
        return {'version': 1, 'reviewId': self.data['reviewId'], 'head': self.data['head'],
                'updatedAt': 1, 'current': 2, 'reviewed': [1], 'drafts': {'draft': '还没保存\nNext line'},
                'notes': [{'id': 'old-note', 'chunk': 1, 'file': 'src/one.js', 'side': 'old', 'line': 2,
                           'text': 'Does the old contract still hold?'},
                          {'id': 'new-note', 'chunk': 1, 'file': 'src/one.js', 'side': 'new', 'line': 3,
                           'text': '保存问题\nAnother line'},
                          {'id': 'file-note', 'chunk': 2, 'file': 'mode.sh', 'side': 'file', 'line': None,
                           'text': 'Check the executable mode'}]}

    def post(self, state, **kwargs):
        return self.request('/state', json.dumps(state, ensure_ascii=False).encode(),
                            token=self.token, **kwargs)

    def test_loopback_page_health_and_initial_state(self):
        self.assertRegex(self.url, r'^http://127\.0\.0\.1:\d+/$')
        status, headers, html = self.request('/review.html')
        self.assertEqual(status, 200)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.assertIn('text/html', headers['Content-Type'])
        self.assertNotIn(b'__SAVE_TOKEN__', html)
        self.assertEqual(json.loads(self.request('/health')[2]), {'reviewId': self.data['reviewId']})
        self.assertEqual(self.request('/state', token=self.token)[2], b'null')

    def test_state_access_requires_the_page_token_and_routes_are_restricted(self):
        for token in (None, 'wrong-token'):
            with self.subTest(token=token):
                self.assertEqual(self.request('/state', token=token)[0], 404)
                self.assertEqual(self.request('/state', b'{}', token=token)[0], 403)
        for path in ('/review-data.json', '/review-notes.json', '/../outside'):
            self.assertEqual(self.request(path, token=self.token)[0], 404)
        self.assertEqual(self.request('/unknown', b'{}', token=self.token)[0], 403)
        self.assertFalse((self.out / 'review-notes.json').exists())

    def test_saved_notes_progress_and_drafts_roundtrip_as_utf8_lf(self):
        state = self.state()
        self.assertEqual(self.post(state)[0], 200)
        self.assertEqual(json.loads(self.request('/state', token=self.token)[2]), state)
        raw = (self.out / 'review-notes.json').read_bytes()
        self.assertEqual(json.loads(raw), state)
        self.assertIn('保存问题'.encode(), raw)
        self.assertNotIn(b'\r', raw)
        self.assertFalse((self.out / 'review-notes.json.tmp').exists())

    def test_restart_restores_notes_and_invalidates_the_old_token(self):
        state = self.state()
        self.post(state)
        old_token = self.token
        self.stop()
        self.start()
        self.assertNotEqual(self.token, old_token)
        self.assertEqual(json.loads(self.request('/state', token=self.token)[2]), state)
        self.assertEqual(self.request('/state', token=old_token)[0], 404)
        self.assertEqual(self.request('/state', b'{}', token=old_token)[0], 403)

    def test_a_second_invocation_reuses_the_running_review(self):
        result = subprocess.run([sys.executable, '-B', str(SKILL / 'scripts/serve.py'),
                                 '--directory', str(self.out)], capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('Already running: ' + self.url, result.stdout)
        self.assertEqual(json.loads((self.out / 'review-server.json').read_text())['pid'], self.process.pid)
        self.assertEqual(self.request('/health')[0], 200)

    def test_invalid_snapshots_and_annotation_anchors_do_not_replace_saved_state(self):
        valid = self.state()
        self.post(valid)
        before = (self.out / 'review-notes.json').read_bytes()
        mutations = [
            {'reviewId': 'another-review'}, {'head': 'b' * 40}, {'current': True}, {'current': 3},
            {'reviewed': [True]}, {'reviewed': [3]}, {'drafts': 'bad'}, {'drafts': {'draft': 1}},
            {'notes': 'bad'}, {'notes': [None]},
        ]
        note_mutations = [{'id': '../bad'}, {'file': 'src/missing.js'}, {'chunk': 3},
                          {'text': None}, {'text': 'x' * 50001}, {'side': 'unknown'},
                          {'side': 'new', 'line': 2}, {'side': 'old', 'line': True},
                          {'side': 'file', 'line': 2}]
        mutations.extend({'notes': [{**valid['notes'][0], **change}]} for change in note_mutations)
        for change in mutations:
            with self.subTest(change=list(change)):
                state = copy.deepcopy(valid)
                state.update(change)
                self.assertEqual(self.post(state)[0], 400)
                self.assertEqual((self.out / 'review-notes.json').read_bytes(), before)
        self.assertEqual(self.request('/health')[0], 200)

    def test_malformed_json_and_invalid_body_lengths_are_rejected(self):
        for body, headers in [(b'{', {}), (b'', {}), (b'{}', {'Content-Length': '2000001'}),
                              (b'{}', {'Content-Length': 'invalid'})]:
            with self.subTest(headers=headers):
                self.assertEqual(self.request('/state', body, token=self.token, headers=headers)[0], 400)
        self.assertFalse((self.out / 'review-notes.json').exists())
        self.assertEqual(self.request('/health')[0], 200)

    def test_file_write_failure_is_reported_and_the_server_can_recover(self):
        blocker = self.out / 'review-notes.json.tmp'
        blocker.mkdir()
        self.assertEqual(self.post(self.state())[0], 500)
        self.assertFalse((self.out / 'review-notes.json').exists())
        blocker.rmdir()
        self.assertEqual(self.post(self.state())[0], 200)

    def test_concurrent_saves_leave_one_complete_json_state(self):
        states = []
        for i in range(8):
            state = self.state()
            state['notes'][0]['text'] = f'Concurrent question {i}'
            states.append(state)
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            responses = list(pool.map(self.post, states))
        self.assertTrue(all(response[0] == 200 for response in responses))
        saved = json.loads(self.request('/state', token=self.token)[2])
        self.assertIn(saved, states)
        self.assertEqual(json.loads((self.out / 'review-notes.json').read_bytes()), saved)
        self.assertFalse((self.out / 'review-notes.json.tmp').exists())


if __name__ == '__main__':
    unittest.main()
