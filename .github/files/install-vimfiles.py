import shutil
import time
from pathlib import Path

home = Path.home()
src = Path(__file__).resolve().parent
suffix = time.strftime('.bak-%Y%m%d%H%M%S')


def move_aside(path):
    if not (path.is_symlink() or path.exists()):
        return
    backup = path.with_name(path.name + suffix)
    n = 1
    while backup.is_symlink() or backup.exists():
        backup = path.with_name(f'{path.name}{suffix}-{n}')
        n += 1
    path.rename(backup)
    print(f'Moved {path} to {backup}')


(home / '.config').mkdir(parents=True, exist_ok=True)

dotvim = home / '.vim'
dotnvim = home / '.config' / 'nvim'

move_aside(home / '.vimrc')
shutil.copyfile(src / 'vimrc', home / '.vimrc')

if (src / 'vim').exists():
    move_aside(dotvim)
    shutil.copytree(src / 'vim', dotvim)

move_aside(dotnvim)
shutil.copytree(src / 'nvim', dotnvim)

state_dir = home / '.local' / 'state' / 'vim'
for dir in ['backup', 'swap', 'undo']:
    (state_dir / dir).mkdir(parents=True, exist_ok=True)
