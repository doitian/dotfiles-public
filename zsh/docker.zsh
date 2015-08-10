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
  /usr/local/bin/boot2docker init
  /usr/local/bin/boot2docker up && export DOCKER_HOST=tcp://$(/usr/local/bin/boot2docker ip 2>/dev/null):2376 && export DOCKER_CERT_PATH="$HOME/.boot2docker/certs/boot2docker-vm" && export DOCKER_TLS_VERIFY=1
  tmux set-environment DOCKER_HOST "$DOCKER_HOST"
  docker version
}
