import importlib.util
import json
import os
import subprocess
from pathlib import Path


SKILL = Path(__file__).resolve().parents[2] / 'ai' / 'local-skills' / 'guided-pr-review'
spec = importlib.util.spec_from_file_location('review_prepare', SKILL / 'scripts' / 'prepare.py')
PREPARE = importlib.util.module_from_spec(spec)
spec.loader.exec_module(PREPARE)


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False) + '\n', encoding='utf-8', newline='\n')


class GitReview:
    def __init__(self, root):
        self.repo = root / 'repo'
        self.repo.mkdir()
        self.env = {**os.environ, 'GIT_CONFIG_GLOBAL': os.devnull,
                    'GIT_CONFIG_NOSYSTEM': '1', 'GIT_TERMINAL_PROMPT': '0'}
        self.git('init', '--quiet', '--initial-branch=main')
        for key, value in {'user.name': 'Review test', 'user.email': 'review@example.test',
                           'core.autocrlf': 'false', 'core.filemode': 'false',
                           'commit.gpgsign': 'false', 'core.hooksPath': str(root / 'no-hooks')}.items():
            self.git('config', key, value)
        self.write('src/logic.py', ''.join(f'value_{i} = {i}\n' for i in range(30)))
        self.write('obsolete.txt', 'Remove this file\n')
        self.write('old-name.txt', 'Move this file\n')
        self.write('assets/binary.bin', b'\xff\x00old')
        self.write('nul-source.txt', 'old\x00text\n')
        self.write('executable.py', 'print("mode only")\n')
        self.commit('Initial files')
        self.git('checkout', '--quiet', '-b', 'layer-one')
        self.write('prior-layer.txt', 'Earlier PR change\n')
        self.merge_base = self.commit('Earlier PR layer')
        self.git('checkout', '--quiet', '-b', 'layer-two')
        lines = (self.repo / 'src/logic.py').read_text(encoding='utf-8').splitlines(keepends=True)
        lines[3], lines[22] = 'value_3 = 300\n', 'value_22 = 2200\n'
        self.write('src/logic.py', ''.join(lines))
        (self.repo / 'obsolete.txt').unlink()
        (self.repo / 'old-name.txt').rename(self.repo / 'new-name.txt')
        self.write('new.txt', 'Added without a final newline')
        self.write('assets/binary.bin', b'\xff\x00new')
        self.write('nul-source.txt', 'new\x00text\n')
        self.git('add', '-A')
        self.git('update-index', '--chmod=+x', 'executable.py')
        self.head = self.commit('Current PR changes', stage=False)
        self.git('checkout', '--quiet', 'layer-one')
        self.write('base-only.txt', 'Later base branch change\n')
        self.base_tip = self.commit('Advance the PR base')
        self.git('checkout', '--quiet', 'layer-two')
        self.write('uncommitted.txt', 'User work must stay intact\n')
        self.git('remote', 'add', 'origin', 'https://github.com/example/review.git')
        self.git('remote', 'add', 'wrong', 'https://github.com/other/review.git')
        self.metadata = {'number': 7, 'title': 'Stacked review test',
                         'url': 'https://github.com/example/review/pull/7',
                         'baseRefName': 'layer-one', 'baseRefOid': self.base_tip,
                         'headRefName': 'layer-two', 'headRefOid': self.head, 'state': 'OPEN'}
        self.metadata_path = root / 'metadata.json'
        write_json(self.metadata_path, self.metadata)

    def git(self, *args):
        result = subprocess.run(['git', *args], cwd=self.repo, env=self.env,
                                capture_output=True, timeout=10)
        if result.returncode:
            raise RuntimeError(f'Git fixture {args[0]} failed: {result.stderr.decode("utf-8")}')
        return result.stdout.decode('utf-8').strip()

    def write(self, path, contents):
        target = self.repo / path
        target.parent.mkdir(parents=True, exist_ok=True)
        if isinstance(contents, bytes):
            target.write_bytes(contents)
        else:
            target.write_text(contents, encoding='utf-8', newline='\n')

    def commit(self, message, stage=True):
        if stage:
            self.git('add', '-A')
        self.git('commit', '--quiet', '-m', message)
        return self.git('rev-parse', 'HEAD')
