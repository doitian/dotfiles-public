#!/usr/bin/env bash
# Run as the desktop user; sudo is used only for packages, firewall, and linger.
set -euo pipefail
vnc_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
links_only=false
case "${1:-}" in
    '') ;;
    --link-only) links_only=true ;;
    *) echo "Usage: $0 [--link-only]" >&2; exit 1 ;;
esac
if (( $# > 1 )); then
    echo "Usage: $0 [--link-only]" >&2
    exit 1
fi
if (( EUID == 0 )); then
    echo 'Run this script as your desktop user, without sudo.' >&2
    exit 1
fi

# Keep the whole IceWM tree behind one link, outside manage.sh's default pass.
check_link() {
    local source="$1" target="$2" legacy="${3:-}"
    if [[ -L "$target" ]]; then
        local current
        current="$(readlink -m "$target")"
        if [[ "$current" != "$source" && "$current" != "$legacy" ]]; then
            printf 'Refusing to replace an unrelated link: %s\n' "$target" >&2
            exit 1
        fi
    elif [[ -e "$target" ]]; then
        printf 'Preserve and move the existing path aside before linking: %s\n' "$target" >&2
        exit 1
    fi
}
config_link="$HOME/.config/icewm-vnc"
service_link="$HOME/.config/systemd/user/ipad-vnc.service"
check_link "$vnc_dir/icewm-vnc" "$config_link"
check_link "$vnc_dir/ipad-vnc.service" "$service_link" \
    "$(dirname "$vnc_dir")/default/.config/systemd/user/ipad-vnc.service"
mkdir -p "$HOME/.config/systemd/user"
ln -sfnT "$vnc_dir/icewm-vnc" "$config_link"
ln -sfnT "$vnc_dir/ipad-vnc.service" "$service_link"
systemctl --user daemon-reload
if "$links_only"; then
    echo 'VNC directory and service links updated; running sessions were not restarted.'
    exit 0
fi

echo 'Installing TigerVNC, IceWM, Kitty, Rofi, and the Sarasa UI font.'
sudo pacman -S --needed --noconfirm tigervnc icewm kitty rofi ttf-sarasa-gothic xorg-xrdb xorg-xrandr xsettingsd xorg-xset xorg-xsetroot python-xlib

install -d -m 700 "$HOME/.config/tigervnc"
if [[ ! -s "$HOME/.config/tigervnc/passwd" ]]; then
    echo 'Choose a separate VNC password (6–8 characters; VNC uses only the first 8).'
    vncpasswd "$HOME/.config/tigervnc/passwd"
fi
chmod 600 "$HOME/.config/tigervnc/passwd"

echo 'Allowing VNC only from the current Wi-Fi LAN (10.31.0.0/16 on wlan0).'
sudo ufw allow in on wlan0 from 10.31.0.0/16 to any port 5901 proto tcp comment 'iPad VNC LAN'
sudo ufw status verbose
sudo loginctl enable-linger "$USER"
systemctl --user daemon-reload
systemctl --user enable --now ipad-vnc.service
sleep 2
systemctl --user --no-pager --full status ipad-vnc.service
echo 'Connect your iPad VNC client to 10.31.0.7, TCP port 5901, using your VNC password.'
