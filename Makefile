RUBY_VERSION := 2.1.5
BREW_FORMULAE := ansible ant atool bash colordiff coreutils ctags dos2unix duti editorconfig fasd gettext gist git git-number gmp htop-osx hub imagemagick jq lua "macvim --override-system-vim" mariadb mongodb mtr multimarkdown ossp-uuid p7zip pidof pngquant postgresql pstree pv redis rlwrap subversion tag the_silver_searcher tig tmux unrar watch zsh-completions pandoc mas
CASK_FORMULAE := 1password a-better-finder-rename adobe-photoshop-cc adobe-photoshop-lightroom airserver alfred bartender bmglyph calibre carbon-copy-cloner chromium cleanmymac cyberduck dropzone evernote fluid fork hazel hype istat-menus keyboard-maestro libreoffice little-snitch marked medis omnifocus omnigraffle omnioutliner paragon-ntfs paw physicseditor sketch slicy snagit spriteilluminator sublime-text surge texturepacker vitamin-r xscope send-to-kindle intellij-idea-ce thunder caffeine scroll-reverser
PIP_PACKAGES := redis httpie Pygments
NPM_PACKAGES := js-beautify eslint eslint-plugin-react jsonlint rtail
GEM_PACKAGES := dotenv mdless
define MAS_PACKAGES
836500024 WeChat (2.0.4)
451108668 QQ (5.1.2)
866773894 Quiver (3.0.3)
1082624744 Gifox (1.2.0)
928871589 Noizio (1.5)
527618971 Pixa (1.1.8)
1026349850 Copied (1.1.6)
449589707 Dash (3.3.1)
880001334 Reeder (3.0.1)
419330170 Moom (3.2.5)
490152466 iBooks Author (2.5)
863486266 SketchBook (8.2.3)
970502923 Typeeto (1.4.1)
902111700 Blogo (3.1.2)
1055511498 Day One (2.1.0)
618061906 Softmatic ScreenLayers (1.1)
451691288 Contacts Sync For Google Gmail (6.5.1)
715768417 Microsoft Remote Desktop (8.0.26009)
491854842 有道词典 (2.0.2)
450201424 Lingon 3 (3.1.4)
623795237 Ulysses (2.6)
461369673 VOX (2.8.4)
682658836 GarageBand (10.1.2)
639764244 Xee³ (3.5.2)
594432954 Read CHM (1.6)
595615424 QQMusic (4.1.1)
734418810 SSH Tunnel (16.07)
425424353 The Unarchiver (3.11.1)
424389933 Final Cut Pro (10.2.3)
622066258 Softmatic WebLayers (1.1)
407963104 Pixelmator (3.5.1)
402688205 Mental Case (2.9.1)
416091648 Pochade (2.2)
445189367 PopClip (1.5.5)
1053031090 Boxy (1.2.1)
557168941 Tweetbot (2.4.3)
568494494 Pocket (1.6.2)
429449079 Patterns - The Regex App
955297617 CodeRunner 2
747961939 Toad
endef
export MAS_PACKAGES

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

mas:
	mas install $(echo "$$MAS_PACKAGES" | cut -f1 -d' ')

.PHONY: fresh install bootstrap bootlinux xcode homebrew rbenv vim pip npm gem mas
