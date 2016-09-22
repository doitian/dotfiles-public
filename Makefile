RUBY_VERSION := 2.1.5
BREW_FORMULAE := ansible ant atool bash colordiff coreutils ctags dos2unix duti editorconfig fasd gettext gist git git-number gmp htop-osx hub imagemagick jq lua "macvim --override-system-vim" mariadb mongodb mtr multimarkdown ossp-uuid p7zip pidof pngquant postgresql pstree pv redis rlwrap subversion tag the_silver_searcher tig tmux unrar watch zsh-completions pandoc
PIP_PACKAGES := redis httpie Pygments percol
NPM_PACKAGES := js-beautify eslint eslint-plugin-react jsonlint rtail
GEM_PACKAGES := dotenv mdless

fresh:
	fresh

install:
	./install.sh

bootstrap: xcode homebrew install rbenv vim pip gem npm
	mkdir ~/codebase

bootlinux: install vim npm

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
	vim +PlugInstall +qall

.PHONY: fresh install bootstrap bootlinux xcode homebrew rbenv vim pip npm gem
