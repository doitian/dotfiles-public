ROUTES_SITE="http://chnroutes-dl.appspot.com/"
ROUTES_DIR="$HOME/.routes"

OVPN_CONFIG_DIR="$HOME/Dropbox/Secrets/openvpn"
OVPN_ROUTES_FILE="$ROUTES_DIR/openvpn/routes.txt"

L2TP_CONFIG_DIR="$HOME/Dropbox/Secrets/l2tp"

# Start/stop L2TP/IPSec VPN.
#
# All VPN config should be in $OVPN_CONFIG_DIR. Each directory is a VPN configuration.
#
# See http://github.com/doitian/vpn-config-sample
ovpn () {
  if [ -z "$1" ]; then
    echo "Usage: ovpn [--route] NAME"
    return 1
  fi

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
    if [ -f "$OVPN_ROUTES_FILE" ]; then
      if ! [ -f client-with-routes.conf -a client-with-routes.conf -nt "$OVPN_ROUTES_FILE" -a client-with-routes.conf -nt client.conf ]; then
        local num=$(( $(wc -l "$OVPN_ROUTES_FILE" | cut -d\  -f1 ) + 50 ))
        echo "max-routes $num" | cat - client.conf "$OVPN_ROUTES_FILE" > client-with-routes.conf
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

_ovpn () {
  compadd $(ls $OVPN_CONFIG_DIR) '--route'
}

download-routes () {
  local file_name
  local file_path

  mkdir -p "$ROUTES_DIR"
  curl ${ROUTES_SITE} | sed -n 's/^.*href="(\/downloads[^"]+)">([^<]+).zip.*$/\2 \1/p' \
    | {
    while read file_name file_path; do
      mkdir -p "${ROUTES_DIR}/${file_name}"
      curl ${ROUTES_SITE}/${file_path} > "${ROUTES_DIR}/${file_name}/${file_name}.zip"
      unzip -o "${ROUTES_DIR}/${file_name}/${file_name}.zip" -d "${ROUTES_DIR}/${file_name}"
      chmod u+r "${ROUTES_DIR}/${file_name}/*"
    done
  }
}

# Start/stop L2TP/IPSec VPN.
#
# All VPN config should be in $L2TP_CONFIG_DIR. Each directory is a VPN configuration.
#
# See http://github.com/doitian/vpn-config-sample
l2tp () {
  if [ -z "$1" ]; then
    echo "Usage: l2tp stop | [--route] NAME"
    return 1
  fi

  case "$1" in
    stop)

      sudo /etc/rc.d/openswan stop
      sudo /etc/rc.d/xl2tpd stop

      ;;
    *)
      local route=
      if [ "$1" = "--route" ]; then
        shift
        route=1
      fi

      # generate config
      local dir="$L2TP_CONFIG_DIR/$1"
      local INTERFACE=eth0
      if ip addr show wlan0 | grep -q UP; then
        INTERFACE=wlan0
      fi
      local LOCAL_IP=$(ifconfig "$INTERFACE" | grep "inet "| awk '{print $2}')
      local SERVER_IP=
      local SHARED_KEY=
      local VPN_USERNAME=
      local VPN_PASSWORD=
      if [ -f "$dir/config.sh" ]; then
        source "$dir/config.sh"
      fi

      local file_basename=
      local file_path=
      for file_path in \
        /etc/ipsec.conf \
        /etc/ipsec.secrets \
        /etc/ppp/options.l2tpd.client \
        /etc/xl2tpd/xl2tpd.conf; do
        file_basename=$(basename "$file_path")
        file_src_path="$dir/$file_basename"
        if ! [ -e "$file_src_path" ]; then
          file_src_path="$L2TP_CONFIG_DIR/common/$file_basename"
        fi
        sed -e "s/\{LOCAL_IP\}/${LOCAL_IP}/g" \
          -e "s/\{SERVER_IP\}/${SERVER_IP}/g" \
          -e "s/\{INTERFACE\}/${INTERFACE}/g" \
          -e "s/\{SHARED_KEY\}/${SHARED_KEY}/g" \
          -e "s/\{VPN_USERNAME\}/${VPN_USERNAME}/g" \
          -e "s/\{VPN_PASSWORD\}/${VPN_PASSWORD}/g" \
          "$file_src_path" \
          | sudo tee "$file_path" > /dev/null
        sudo chmod 600 "$file_path"
        sudo chown root: "$file_path"
      done

      if [ -n "$route" ]; then
        sudo cp -f "$ROUTES_DIR/linux/ip-pre-up" /etc/ppp/ip-up.d/50-l2tp.sh
        sudo cp -f "$ROUTES_DIR/linux/ip-down" /etc/ppp/ip-down.d/50-l2tp.sh
      else
        : | sudo tee /etc/ppp/ip-up.d/50-l2tp.sh > /dev/null
        : | sudo tee /etc/ppp/ip-down.d/50-l2tp.sh > /dev/null
      fi

      sed -e "s/\{SERVER_IP\}/${SERVER_IP}/g" \
        -e "s/\{INTERFACE\}/${INTERFACE}/g" \
        "$L2TP_CONFIG_DIR/ip-up" \
        | sudo tee -a /etc/ppp/ip-up.d/50-l2tp.sh > /dev/null
      sed -e "s/\{SERVER_IP\}/${SERVER_IP}/g" \
        -e "s/\{INTERFACE\}/${INTERFACE}/g" \
        "$L2TP_CONFIG_DIR/ip-down" \
        | sudo tee -a /etc/ppp/ip-down.d/50-l2tp.sh > /dev/null

      sudo chmod 500 /etc/ppp/ip-up.d/50-l2tp.sh
      sudo chown root: /etc/ppp/ip-up.d/50-l2tp.sh
      sudo chmod 500 /etc/ppp/ip-down.d/50-l2tp.sh
      sudo chown root: /etc/ppp/ip-down.d/50-l2tp.sh

      sudo /etc/rc.d/openswan start
      sudo /etc/rc.d/xl2tpd start
      sudo ipsec auto --up L2TP-PSK
      echo "c vpn-connection" | sudo tee /var/run/xl2tpd/l2tp-control
      ;;
  esac
}

_l2tp () {
  compadd $(ls $L2TP_CONFIG_DIR | grep -v '^ip-\|^common$') stop '--route'
}

compdef _ovpn ovpn
compdef _l2tp l2tp
