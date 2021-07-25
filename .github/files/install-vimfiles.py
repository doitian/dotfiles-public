import shutil
from pathlib import Path

home = Path.home()
dotvim = home / '.vim'

shutil.rmtree(dotvim, ignore_errors=True)

shutil.copyfile('vimrc', home / '.vimrc')
shutil.copytree('vim', dotvim)

for dir in ['backup', 'swap', 'undo']:
    (dotvim / dir).mkdir()
