fresh:
	fresh

install:
	./install.sh

bootstrap: xcode homebrew install rbenv vim
	mkdir ~/codebase

xcode:
	xcode-select --install || true

homebrew:
	@if ! which brew &> /dev/null; then \
	  echo "Installing homebrew..."; \
	  ruby -e "$$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"; \
	fi
	brew update
	brew install ansible
	brew install ant
	brew install aspell
	brew install atool
	brew install colordiff
	brew install coreutils
	brew install ctags
	brew install duti
	brew install elixir
	brew install fasd
	brew install fswatch
	brew install gist
	brew install git
	brew install git-number
	brew install gmp
	brew install htop-osx
	brew install hub
	brew install imagemagick
	brew install macvim --override-system-vim
	brew install mariadb
	brew install mongodb
	brew install msgpack
	brew install multimarkdown
	brew install node
	brew install ossp-uuid
	brew install p7zip
	brew install pidof
	brew install pngquant
	brew install postgresql
	brew install pstree
	brew install reattach-to-user-namespace
	brew install rebar
	brew install redis
	brew install rlwrap
	brew install ssh-copy-id
	brew install subversion
	brew install tag
	brew install terminal-notifier
	brew install the_silver_searcher
	brew install tig
	brew install tmux
	brew install unrar
	brew install watch
	brew install youtube-dl
	brew install zsh-completions

rbenv:
	~/bin/rbenv-update
	rbenv install -s 2.1.5
	rbenv global 2.1.5

vim:
	vim +PluginInstall +qall

.PHONY: fresh install bootstrap xcode homebrew rbenv vim
