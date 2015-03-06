RUBY_VERSION := 2.1.5
BREW_FORMULAE := ansible ant atool colordiff coreutils ctags duti elixir fasd fswatch gist git git-number gmp htop-osx hub imagemagick "macvim --override-system-vim" mariadb mongodb msgpack multimarkdown node ossp-uuid p7zip pidof pngquant postgresql pstree reattach-to-user-namespace rebar redis rlwrap subversion tag terminal-notifier the_silver_searcher tig tmux unrar watch zsh-completions
PIP_PACKAGES := percol redis httpie Pygments
NPM_PACKAGES := js-beautify

fresh:
	fresh

install:
	./install.sh

bootstrap: xcode homebrew install rbenv vim pip npm
	mkdir ~/codebase

xcode:
	xcode-select --install || true

homebrew:
	@if ! which brew &> /dev/null; then \
	  echo "Installing homebrew..."; \
	  ruby -e "$$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"; \
	fi
	brew update
	$(foreach formula,$(BREW_FORMULAE),brew install $(formula);)

pip:
	sudo pip install $(PIP_PACKAGES)

npm:
	npm install -g $(NPM_PACKAGES)

rbenv:
	~/bin/rbenv-update
	rbenv install -s $(RUBY_VERSION)
	rbenv global $(RUBY_VERSION)

vim:
	vim +PluginInstall +qall

.PHONY: fresh install bootstrap xcode homebrew rbenv vim pip npm
