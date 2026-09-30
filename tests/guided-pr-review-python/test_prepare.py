import argparse
import contextlib
import copy
import io
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from helpers import GitReview, PREPARE, SKILL, write_json


class PrepareTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.fixture_dir = tempfile.TemporaryDirectory(prefix='review-git-test-')
        cls.addClassCleanup(cls.fixture_dir.cleanup)
        cls.review = GitReview(Path(cls.fixture_dir.name))

    def setUp(self):
        output = tempfile.TemporaryDirectory(prefix='review-prepare-test-')
        self.addCleanup(output.cleanup)
        self.out = Path(output.name)

    def snapshot(self, **overrides):
        args = argparse.Namespace(repo=self.review.repo, out=self.out, metadata=self.review.metadata_path,
                                  pr=None, no_fetch=True, remote='origin')
        for key, value in overrides.items():
            setattr(args, key, value)
        with contextlib.redirect_stdout(io.StringIO()):
            PREPARE.snapshot(args)
        return PREPARE.load(self.out / 'snapshot.json')

    def plan(self, captured):
        others = [f['path'] for f in captured['files'] if f['path'] != 'src/logic.py']
        return [
            {'title': 'First behavior', 'objective': 'Inspect the first change',
             'focus': ['Is the caller compatible?'],
             'context': [{'title': 'Caller', 'body': 'The next behavior depends on this change.',
                          'links': [{'label': 'Dependent behavior', 'chunk': 2}]}],
             'files': [{'path': 'src/logic.py', 'hunks': [0]}, *others]},
            {'title': 'Second behavior', 'objective': 'Inspect the later change',
             'files': [{'path': 'src/logic.py', 'hunks': [1]}]},
        ]

    def build(self, plan):
        plan_path = self.out / 'plan.json'
        write_json(plan_path, plan)
        with contextlib.redirect_stdout(io.StringIO()):
            PREPARE.build(argparse.Namespace(directory=self.out, plan=plan_path))
        return PREPARE.load(self.out / 'review-data.json')

    def test_snapshot_uses_actual_stacked_merge_base_and_preserves_checkout(self):
        before = self.review.git('status', '--porcelain'), self.review.git('symbolic-ref', '--short', 'HEAD')
        captured = self.snapshot()
        self.assertEqual(captured['metadata']['mergeBaseOid'], self.review.merge_base)
        self.assertNotEqual(self.review.merge_base, self.review.base_tip)
        self.assertEqual(captured['metadata']['headRefOid'], self.review.head)
        paths = {f['path'] for f in captured['files']}
        self.assertEqual(paths, {'src/logic.py', 'obsolete.txt', 'old-name.txt', 'new-name.txt',
                                 'new.txt', 'assets/binary.bin', 'nul-source.txt', 'executable.py'})
        self.assertEqual(before, (self.review.git('status', '--porcelain'),
                                  self.review.git('symbolic-ref', '--short', 'HEAD')))
        self.assertEqual((self.review.repo / 'uncommitted.txt').read_text(), 'User work must stay intact\n')

    def test_snapshot_preserves_disjoint_line_anchors_and_no_final_newline(self):
        files = {f['path']: f for f in self.snapshot()['files']}
        logic = files['src/logic.py']
        self.assertEqual(len(logic['hunks']), 2)
        self.assertEqual([(r['old'], r['text']) for r in logic['rows'] if r['kind'] == 'del'],
                         [(4, 'value_3 = 3'), (23, 'value_22 = 22')])
        self.assertEqual([(r['new'], r['text']) for r in logic['rows'] if r['kind'] == 'add'],
                         [(4, 'value_3 = 300'), (23, 'value_22 = 2200')])
        self.assertEqual(files['new.txt']['additions'], 1)
        self.assertTrue(any('No newline at end of file' in r['text'] for r in files['new.txt']['rows']))
        inventory = PREPARE.load(self.out / 'inventory.json')
        self.assertTrue(all('rows' not in f for f in inventory))

    def test_snapshot_represents_renames_binary_recovered_text_and_mode_only_changes(self):
        files = {f['path']: f for f in self.snapshot()['files']}
        self.assertEqual(files['old-name.txt']['status'], 'D')
        self.assertEqual(files['new-name.txt']['status'], 'A')
        self.assertTrue(files['obsolete.txt']['deleted'])
        self.assertTrue(files['assets/binary.bin']['binary'])
        self.assertEqual(files['assets/binary.bin']['hunks'], [])
        self.assertFalse(files['assets/binary.bin']['recovered'])
        self.assertTrue(files['nul-source.txt']['recovered'])
        self.assertTrue(any('\x00' in r['text'] for r in files['nul-source.txt']['rows']))
        self.assertEqual(files['executable.py']['hunks'], [])
        self.assertTrue(any(r['text'] == 'new mode 100755' for r in files['executable.py']['rows']))

    def test_existing_snapshot_is_never_overwritten(self):
        self.snapshot()
        before = (self.out / 'snapshot.json').read_bytes()
        with self.assertRaisesRegex(ValueError, 'snapshot already exists'):
            self.snapshot()
        self.assertEqual((self.out / 'snapshot.json').read_bytes(), before)

    def test_offline_missing_commit_and_mismatched_remote_do_not_fetch(self):
        metadata = {**self.review.metadata, 'headRefOid': 'f' * 40}
        metadata_path = self.out / 'missing.json'
        write_json(metadata_path, metadata)
        original = PREPARE.run
        with patch.object(PREPARE, 'run', wraps=original) as run:
            with self.assertRaisesRegex(ValueError, 'Missing commit'):
                self.snapshot(metadata=metadata_path)
            with self.assertRaisesRegex(ValueError, 'remote does not match'):
                self.snapshot(metadata=metadata_path, no_fetch=False, remote='wrong')
        self.assertFalse(any(call.args[0][:2] == ['git', 'fetch'] for call in run.call_args_list))
        self.assertFalse((self.out / 'snapshot.json').exists())

    def test_gh_metadata_path_uses_recorded_commits(self):
        original = PREPARE.run

        def read_metadata(args, *positional, **keywords):
            return json.dumps(self.review.metadata) if args[:3] == ['gh', 'pr', 'view'] else original(args, *positional, **keywords)

        with patch.object(PREPARE, 'run', side_effect=read_metadata) as run:
            captured = self.snapshot(metadata=None, pr=self.review.metadata['url'])
        self.assertEqual(captured['metadata']['headRefOid'], self.review.head)
        self.assertEqual(sum(call.args[0][:3] == ['gh', 'pr', 'view'] for call in run.call_args_list), 1)

    def test_build_covers_split_hunks_and_nontext_changes_exactly_once(self):
        captured = self.snapshot()
        data = self.build(self.plan(captured))
        coverage = PREPARE.load(self.out / 'coverage.json')
        self.assertTrue(coverage['complete'])
        self.assertEqual(coverage['changedFiles'], 8)
        self.assertEqual(coverage['chunks'], 2)
        self.assertEqual(coverage['hunksAndNonTextChanges'], 9)
        for chunk, expected in zip(data['chunks'], [0, 1]):
            logic = next(f for f in chunk['files'] if f['path'] == 'src/logic.py')
            self.assertEqual({r['hunk'] for r in logic['rows']}, {expected})
        self.assertEqual(data['base'], self.review.merge_base)
        for path in self.out.iterdir():
            if path.suffix in ('.html', '.json'):
                self.assertNotIn(b'\r', path.read_bytes(), path.name)

    def test_build_rejects_missing_duplicate_unknown_and_nontext_hunk_coverage(self):
        captured = self.snapshot()
        valid = self.plan(captured)
        missing = copy.deepcopy(valid)
        missing[0]['files'].remove('new.txt')
        duplicate = copy.deepcopy(valid)
        duplicate[1]['files'].append('new.txt')
        unknown = copy.deepcopy(valid)
        unknown[1]['files'].append('unknown.txt')
        unassigned = copy.deepcopy(valid[:1])
        unassigned[0].pop('context')
        nontext = copy.deepcopy(valid)
        nontext[0]['files'] = [{'path': 'assets/binary.bin', 'hunks': []} if f == 'assets/binary.bin' else f
                              for f in nontext[0]['files']]
        for plan, message in [(missing, 'Unassigned'), (duplicate, 'Duplicate'),
                              (unknown, 'Unknown path'), (unassigned, 'Unassigned'),
                              (nontext, 'Invalid hunk selection')]:
            with self.subTest(message=message), self.assertRaisesRegex(ValueError, message):
                self.build(plan)
        self.assertFalse((self.out / 'review.html').exists())

    def test_context_updates_preserve_identity_and_saved_notes(self):
        captured = self.snapshot()
        plan = self.plan(captured)
        first = self.build(plan)
        notes = b'{"userNote":"Preserve this"}\n'
        (self.out / 'review-notes.json').write_bytes(notes)
        plan[0]['context'][0]['body'] = 'New supporting explanation'
        second = self.build(plan)
        self.assertEqual(first['reviewId'], second['reviewId'])
        self.assertEqual((self.out / 'review-notes.json').read_bytes(), notes)
        self.assertEqual(second['chunks'][0]['context'][0]['body'], 'New supporting explanation')
        plan[0]['focus'].append('A different review question')
        with self.assertRaisesRegex(ValueError, 'different chunk plan'):
            self.build(plan)
        self.assertEqual(PREPARE.load(self.out / 'review-data.json')['reviewId'], first['reviewId'])
        self.assertEqual((self.out / 'review-notes.json').read_bytes(), notes)

    def test_context_rejects_unsafe_urls_and_unknown_chunk_links(self):
        captured = self.snapshot()
        for link in [{'label': 'Unsafe', 'url': 'javascript:alert(1)'},
                     {'label': 'Unknown', 'chunk': 3},
                     {'label': 'Ambiguous', 'url': 'https://example.test', 'chunk': 1}]:
            plan = self.plan(captured)
            plan[0]['context'][0]['links'] = [link]
            with self.subTest(link=link), self.assertRaises(ValueError):
                self.build(plan)

    def test_cli_reports_invalid_plan_without_a_traceback(self):
        self.snapshot()
        write_json(self.out / 'bad-plan.json', [])
        result = subprocess.run([sys.executable, '-B', str(SKILL / 'scripts/prepare.py'), 'build',
                                 '--directory', str(self.out), '--plan', str(self.out / 'bad-plan.json')],
                                capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 1)
        self.assertIn('Error: Plan must be a nonempty array.', result.stderr)
        self.assertNotIn('Traceback', result.stderr)

    def test_line_mismatch_and_remote_identity_normalization(self):
        with self.assertRaisesRegex(ValueError, 'Base line mismatch'):
            PREPARE.parse_rows('@@ -1 +1 @@\n-old\n+new\n', b'different\n', b'new\n', 'test.txt')
        self.assertEqual(PREPARE.repository_identity('git@GitHub.com:Example/Review.git'),
                         PREPARE.repository_identity('https://github.com/example/review'))


if __name__ == '__main__':
    unittest.main()
