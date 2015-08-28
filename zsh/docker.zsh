function tmux-docker() {
  local machine=${1:-dev}

  unset DOCKER_HOST
  unset DOCKER_CERT_PATH
  unset DOCKER_TLS_VERIFY
  unset DOCKER_MACHINE_NAME
  tmux set-environment -u DOCKER_HOST
  tmux set-environment -u DOCKER_CERT_PATH
  tmux set-environment -u DOCKER_TLS_VERIFY
  tmux set-environment -u DOCKER_MACHINE_NAME
  eval "$(docker-machine env $machine)"

  tmux set-environment DOCKER_HOST "$DOCKER_HOST"
  tmux set-environment DOCKER_CERT_PATH "$DOCKER_CERT_PATH"
  tmux set-environment DOCKER_TLS_VERIFY "$DOCKER_TLS_VERIFY"
  tmux set-environment DOCKER_MACHINE_NAME "$DOCKER_MACHINE_NAME"
  docker version
}
