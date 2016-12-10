RUBY_VERSION := 2.1.5
BREW_FORMULAE := ant bash colordiff coreutils ctags dos2unix duti editorconfig fasd gettext gist git git-number git-extras htop-osx imagemagick jq lua "macvim --override-system-vim" mtr multimarkdown p7zip pidof pngquant postgresql pstree pv redis rlwrap subversion tag the_silver_searcher tig tmux tree unrar zsh-completions mas python3
CASK_FORMULAE := 1password a-better-finder-rename airserver alfred bartender bmglyph calibre carbon-copy-cloner evernote fluid fork hazel keyboard-maestro libreoffice little-snitch medis omnifocus omnigraffle omnioutliner paragon-ntfs paw sketch slicy snagit sublime-text surge xscope send-to-kindle intellij-idea-ce thunder scroll-reverser dash tickeys
NPM_PACKAGES := js-beautify eslint eslint-plugin-react jsonlint rtail
GEM_PACKAGES := dotenv mdless
define MAS_PACKAGES
836500024 WeChat (2.0.4)
451108668 QQ (5.1.2)
928871589 Noizio (1.5)
880001334 Reeder (3.0.1)
419330170 Moom (3.2.5)
490152466 iBooks Author (2.5)
863486266 SketchBook (8.2.3)
970502923 Typeeto (1.4.1)
1055511498 Day One (2.1.0)
618061906 Softmatic ScreenLayers (1.1)
451691288 Contacts Sync For Google Gmail (6.5.1)
491854842 有道词典 (2.0.2)
450201424 Lingon 3 (3.1.4)
461369673 VOX (2.8.4)
682658836 GarageBand (10.1.2)
639764244 Xee³ (3.5.2)
594432954 Read CHM (1.6)
595615424 QQMusic (4.1.1)
734418810 SSH Tunnel (16.07)
424389933 Final Cut Pro (10.2.3)
622066258 Softmatic WebLayers (1.1)
407963104 Pixelmator (3.5.1)
1053031090 Boxy (1.2.1)
557168941 Tweetbot (2.4.3)
429449079 Patterns - The Regex App
747961939 Toad
1071676469 Studies – Flashcards for Serious Students
endef
export MAS_PACKAGES

fresh:
	fresh

install:
	./install.sh

bootstrap: xcode homebrew install rbenv vim gem npm
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

mas:
	mas install $(echo "$$MAS_PACKAGES" | cut -f1 -d' ')

cask:
	brew cask install $(CASK_FORMULAE)

.PHONY: fresh install bootstrap bootlinux xcode homebrew rbenv vim npm gem mas
