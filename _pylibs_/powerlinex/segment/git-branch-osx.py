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
def branch(pl, segment_info, status_colors=False):

    branch = None
    status = None

    try:
        for line in readlines(['git', 'branch', '-l'], segment_info['getcwd']()):
            if line[0] == '*':
                branch = line[2:]

    except OSError as e:
        print "error getting branch"
        branch = 'error'
        raise


    if status_colors:
        try:
            wt = ' '
            idx = ' '
            unt = ' '
            for line in readlines(['git', 'status', '--porcelain'], segment_info['getcwd']()):
                if line[0] == '?':
                    unt = 'U'
                    continue
                elif line[0] == '!':
                    continue
                if line[0] != ' ':
                    idx = 'I'
                if line[1] != ' ':
                    wt = 'D'
            r = wt + idx + unt
            status = r if r != "   " else None

        except Error:
            pass

        if not branch and not status:
            return None
        return [{
            'contents': branch or 'No branch?',
            'highlight_group': [ 'branch_dirty' if status else 'branch_clean', 'branch']
        }]
