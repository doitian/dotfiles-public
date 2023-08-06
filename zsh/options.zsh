## directories

setopt auto_cd
setopt auto_name_dirs
setopt auto_pushd
setopt cdable_vars
setopt pushd_ignore_dups
setopt pushd_minus

## jobs

# don't kill jobs on exit
unsetopt hup
# run jobs at the same priority as the shell
unsetopt bg_nice

## misc

# enable redirect to multiple streams: echo >file1 >file2
setopt multios
# show long list format job notifications
setopt long_list_jobs
# recognize comments
setopt interactivecomments
