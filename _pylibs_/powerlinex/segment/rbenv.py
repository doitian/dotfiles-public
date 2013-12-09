from __future__ import absolute_import
from subprocess import Popen, PIPE
from powerline.theme import requires_segment_info

def readlines(cmd, cwd):
    p = Popen(cmd, shell=False, stdout=PIPE, stderr=PIPE, cwd=cwd)
    p.stderr.close()
    with p.stdout:
        for line in p.stdout:
            yield line[:-1].decode('utf-8')

@requires_segment_info
def rbenv(pl, segment_info):
    version = None
    gemset = None

    try:
        lines = list(readlines(['rbenv', 'version-name'], segment_info['getcwd']()))
        if len(lines) > 0 and len(lines[0]) > 0:
            version = lines[0]
        lines = list(readlines(['rbenv', 'gemset', 'active'], segment_info['getcwd']()))
        if len(lines) > 0 and len(lines[0]) > 0:
            gemset = lines[0].split()[0]

    except OSError as e:
        print "error getting rbenv version"
        branch = 'error'
        raise

    if not version:
        return None

    segments = [{
        'contents': version,
        'highlight_group': ['ruby:version'],
        'divider_highlight_group': 'ruby:divider',
        'draw_inner_divider': True,
    }]
    if gemset:
        segments.append({
            'contents': gemset,
            'highlight_group': ['ruby:gemset']
        })
    return segments
