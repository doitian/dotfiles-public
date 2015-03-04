function tmux-docker() {
  unset DYLD_LIBRARY_PATH
  unset LD_LIBRARY_PATH
  unset DOCKER_CERT_PATH
  unset DOCKER_TLS_VERIFY
  tmux set-environment -u DYLD_LIBRARY_PATH
  tmux set-environment -u LD_LIBRARY_PATH
  tmux set-environment -u DOCKER_CERT_PATH
  tmux set-environment -u DOCKER_TLS_VERIFY
  mkdir -p ~/.boot2docker
  if [ ! -f ~/.boot2docker/boot2docker.iso ]; then
    cp /usr/local/share/boot2docker/boot2docker.iso ~/.boot2docker/
  fi
  /usr/local/bin/boot2docker init
  /usr/local/bin/boot2docker up && export DOCKER_HOST=tcp://$(/usr/local/bin/boot2docker ip 2>/dev/null):2375
  tmux set-environment DOCKER_HOST "$DOCKER_HOST"
  docker version
}
