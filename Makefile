RUBY_VERSION := 2.1.5
BREW_FORMULAE := ansible ant atool bash boot2docker colordiff coreutils ctags dos2unix duti editorconfig fasd fpp gettext gist git git-number gmp htop-osx hub imagemagick jq lua "macvim --override-system-vim" mariadb mongodb mtr multimarkdown ossp-uuid p7zip pidof pngquant postgresql pstree pv reattach-to-user-namespace redis rlwrap ssh-copy-id subversion tag terminal-notifier the_silver_searcher tig tmux unrar watch zsh-completions
PIP_PACKAGES := redis httpie Pygments percol
NPM_PACKAGES := js-beautify eslint eslint-plugin-react jsonlint rtail
GEM_PACKAGES := dotenv mdless

fresh:
	fresh

install:
	./install.sh

bootstrap: xcode homebrew install rbenv vim pip gem npm
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
	sudo easy_install pip
	sudo pip install --upgrade $(PIP_PACKAGES)

npm:
	npm install -g $(NPM_PACKAGES)

gem:
	sudo /usr/bin/gem install $(GEM_PACKAGES)

rbenv:
	~/bin/rbenv-update
	rbenv install -s $(RUBY_VERSION)
	rbenv global $(RUBY_VERSION)

vim:
	vim +PluginInstall +qall

.PHONY: fresh install bootstrap xcode homebrew rbenv vim pip npm gem
