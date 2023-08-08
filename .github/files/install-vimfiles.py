import shutil
from pathlib import Path

home = Path('..')
(home / '.config').mkdir(parents=True, exist_ok=True)

dotnvim = home / '.config' / 'nvim'

shutil.copyfile('vimrc', home / '.vimrc')

shutil.rmtree(dotnvim, ignore_errors=True)
shutil.copytree('nvim', dotnvim)

state_dir = home / '.local' / 'state' / 'vim'
for dir in ['backup', 'swap', 'undo']:
    (state_dir / dir).mkdir(parents=True, exist_ok=True)
