OVPN_CONFIG_DIR="$HOME/Dropbox/Secrets/vpn"
ROUTES_FILE="$HOME/.routes.txt"
ROUTES_SITE="http://chnroutes-dl.appspot.com/"

ovpn () {
  local route=
  if [ "$1" = "--route" ]; then
    shift
    route=1
  fi
  local dir="${OVPN_CONFIG_DIR}/$1"

  echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
  local interface=eth0
  if ip addr show wlan0 | grep -q UP; then
    interface=wlan0
  fi

  sudo ip link set dev $interface promisc on

  cd "$dir"

  if [ -n "$route" ]; then
    if [ -f "$ROUTES_FILE" ]; then
      if ! [ -f client-with-routes.conf -a client-with-routes.conf -nt "$ROUTES_FILE" -a client-with-routes.conf -nt client.conf ]; then
        local num=$(( $(wc -l "$ROUTES_FILE" | cut -d\  -f1 ) + 50 ))
        echo "max-routes $num" | cat - client.conf "$ROUTES_FILE" > client-with-routes.conf
      fi
      chmod 600 client-with-routes.conf
    else
      cp client.conf client-with-routes.conf
    fi

    sudo openvpn --config client-with-routes.conf
  else
    sudo openvpn --config client.conf
  fi
}

ovpn-update-routes () {
  curl ${ROUTES_SITE}$(curl ${ROUTES_SITE} | grep openvpn | sed -n 's/.*href="([^"]+)".*/\1/p') \
    | zcat > "$ROUTES_FILE"
}

_ovpn () {
  compadd $(ls $OVPN_CONFIG_DIR)
}

compdef _ovpn ovpn
