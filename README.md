# Ian's Configuration Files

See https://github.com/doitian/dotfiles

## Tools I Used

-   Obsidian: note taking
-   WezTerm: terminal emulator
-   asdf: version manager
-   btop: top alternative
-   direnv: per directory env
-   fd: find alternative
-   fzf: fuzzy finder
-   lazygit: git TUI
-   neovim: editor
-   rg: grep alternative
-   starship: shell prompt
-   tmux: terminal multiplexer
-   zoxide: quick cd
-   zsh

## Interesting Widgets I Built

-   [cvim]: edit clipboard using vim
-   [fpass]: copy password from pass via fzf
-   [fzf-finder]: a file explorer built based on fzf, bat, eza
-   [gfw]: a shell proxy manager
-   [git-fzf-log]: pick git log via fzf, using ctrl-l to show commit and open file before changes in neovim
-   [git-multistatus]: quickly check git status of multiple repos using fzf, starship, and lazygit
-   [tmux-up]: a tmux session manager
-   [tt]: a wrap script which sends keys to tmux panes

[cvim]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/cvim
[fpass]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/fpass
[fzf-finder]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/fzf-finder
[gfw]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/gfw
[git-fzf-log]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/gig-fzf-log
[git-multistatus]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/git-multistatus
[tmux-up]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/tmux-up
[tt]: https://github.com/doitian/dotfiles-public/blob/master/default/bin/tt

## Featured Configuration

### Vim

-   Neovim: Copy the folder [nvim] to `~/.config/nvim`.
-   Vim:
    -   Minimal: Just copy [default/.vimrc][vimrc] to `~/.vimrc`
    -   Unpacked: Download vimfiles from the latest job in the [workflow]. See README in it to setup.
    -   Packed: Download vimfiles-packed from the latest job in the [workflow]. See README in it to setup.

The Minimal/Unpacked version requires running `:PackUpdate` to install dependencies.
I build the packed version so I can copy it to iPad and use it in [iVim].

### Zsh

I use the shell script [manage.sh](https://github.com/doitian/dotfiles/blob/master/manage.sh) to merge the zshrc config file.

[nvim]: https://github.com/doitian/dotfiles-public/tree/master/nvim
[vimrc]: https://github.com/doitian/dotfiles-public/blob/master/default/.vimrc
[workflow]: https://github.com/doitian/dotfiles-public/actions/workflows/package-vimfiles.yml
[iVim]: https://apps.apple.com/us/app/ivim/id1266544660
