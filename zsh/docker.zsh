function tmux-docker() {
  unset DYLD_LIBRARY_PATH
  unset LD_LIBRARY_PATH
  unset DOCKER_HOST
  unset DOCKER_CERT_PATH
  unset DOCKER_TLS_VERIFY
  tmux set-environment -u DYLD_LIBRARY_PATH
  tmux set-environment -u LD_LIBRARY_PATH
  tmux set-environment -u DOCKER_HOST
  tmux set-environment -u DOCKER_CERT_PATH
  tmux set-environment -u DOCKER_TLS_VERIFY
  mkdir -p ~/.boot2docker
  /usr/local/bin/boot2docker init
  /usr/local/bin/boot2docker up
  eval $(/usr/local/bin/boot2docker shellinit)
  tmux set-environment DOCKER_HOST "$DOCKER_HOST"
  tmux set-environment DOCKER_CERT_PATH "$DOCKER_CERT_PATH"
  tmux set-environment DOCKER_TLS_VERIFY "$DOCKER_TLS_VERIFY"
  docker version
}
