# iPad LAN desktop

TigerVNC runs a separate IceWM X11 desktop with a Start menu and clickable
window buttons, so navigation does not depend on iPad keyboard shortcuts.
The local Niri desktop continues to run independently. The server uses display
`:1`, TCP port `5901`, and a default 1600×1200 desktop matching the iPad's 4:3 layout.
Viewers can request another resolution. After all viewers disconnect, the desktop
returns to the iPad size without closing applications. The user service starts at
boot once Wi-Fi is available; linger
keeps it running after local logout.

## Installation on this CachyOS host

Run `bash ~/.dotfiles/repos/public/vnc-server/setup-ipad-vnc.sh` as `ian`.
The setup script creates one IceWM directory link and one systemd service link,
installs packages, prompts for a VNC password, adds a UFW rule for `10.31.0.0/16`
on `wlan0`, and enables the service and linger.
It uses the existing pacman databases without refreshing them separately. If a
mirror reports missing packages, perform the usual full system upgrade and retry.

All VNC files live in `~/.dotfiles/repos/public/vnc-server/`:

- `icewm-vnc/`: preferences, shortcuts, menus, fonts, and theme assets.
- `ipad-vnc-session` and `ipad-vnc-taskbar`: session launch and taskbar positioning.
- `ipad-vnc-resolution`: restores the iPad resolution when no viewers remain.
- `ipad-vnc.service`: systemd user service.
- `setup-ipad-vnc.sh`: installation and explicit link management.

The two links are `~/.config/icewm-vnc` → `vnc-server/icewm-vnc` and
`~/.config/systemd/user/ipad-vnc.service` → `vnc-server/ipad-vnc.service`.
This setup is independent of `manage.sh` and its per-file `default/` links.
IceWM's local `ahistory` file is ignored by Git.

To refresh only the links and systemd's service definition, without installing
packages or restarting the desktop, run:

```sh
bash ~/.dotfiles/repos/public/vnc-server/setup-ipad-vnc.sh --link-only
```

The script refuses to overwrite unrelated files or links. If migrating an old
per-file configuration directory, preserve any local files before replacing that
directory with the single link.

## Connect from iPad

Join the same LAN and add a connection in a VNC client:

- Address: `10.31.0.7`
- Port: `5901` (some clients accept `10.31.0.7:5901` as one field)
- Authentication: VNC password; no username
- Password: the one chosen during setup

The server offers `TLSVnc` and standard `VncAuth` for client compatibility.
Standard VNC authentication does not encrypt desktop traffic. Use this direct
connection only on the trusted LAN; do not forward port 5901 on the router.
The listener binds only to the private IPv4 address on `wlan0`, and UFW permits
the current LAN subnet. Reserve the host's address in the router for a stable
connection address. After a Wi-Fi address change, restart the service.

Tap a window's button on the top taskbar to switch to it. Use the Start
menu's **Applications** submenu to browse installed apps. The terminal icon
beside Start opens Kitty. Window title bars have minimize, maximize/restore,
and close buttons; double-tapping the title bar also maximizes/restores it.
The numbered taskbar buttons switch between three workspaces.

**Control+Option+P** opens Rofi to search installed apps and executable commands
in one list. Type to filter, then press Return or click an entry to launch it.
The Start menu also has **Search apps and commands** for mouse access.
Rofi uses your existing configuration with a Sarasa UI SC font, automatic
display DPI, and the VNC Kitty launch options for terminal-based apps. These
overrides apply only to the IceWM launcher.

The top taskbar uses 80% of the desktop width and sits 4 pixels left of center,
leaving 156 pixels on the left and 164 on the right at 1600×1200 for iPadOS icons.
Maximized windows sit below the bar. Fullscreen windows use the whole screen.
Adjust `TaskBarWidthPercentage` in `icewm-vnc/preferences`
if your client needs more or less corner space.
The session helper `ipad-vnc-taskbar` maintains the 4-pixel offset
after display resizing and IceWM reloads. IceWM's native clock padding remains.

### Magic Keyboard shortcuts

The three custom shortcuts use **Control+Option (⌃⌥)**, sent as Ctrl+Alt by the VNC client.
They do not require function keys, Escape, or a numeric keypad. IceWM does not
bind Command/Super, Globe, or hardware media keys. Space-based launcher shortcuts
are avoided to keep input switching available. Option+Tab and the standard
Ctrl+Alt workspace shortcuts remain enabled, as do Alt+mouse actions.
The Start menu has no keyboard binding; use its taskbar button.
The standard Shift shortcuts for reverse switching and moving windows between
workspaces remain available if the client forwards them.

| Custom shortcut | Action |
| --- | --- |
| ⌃⌥Return | Open Kitty |
| ⌃⌥P | Rofi: search apps and commands |
| ⌃⌥Q | Close window |

Other window actions use IceWM's default bindings. Common defaults include:

| Default shortcut | Action |
| --- | --- |
| Option+Tab / Option+Shift+Tab | Next / previous window |
| ⌃⌥Left / Right | Previous / next workspace |
| ⌃⌥1 / 2 / 3 | Switch workspace |
| ⌃⌥Shift+Left / Right | Take window to adjacent workspace |
| ⌃⌥Shift+1 / 2 / 3 | Take window to workspace |
| ⌃⌥D | Show desktop |
| Option+left drag / Option+right drag | Move / resize window |

The VNC client must forward Control as Ctrl and Option as Alt. iPadOS or the
client can still intercept a combination; the taskbar and title buttons remain
available as a mouse/trackpad fallback. These bindings are stored in
`icewm-vnc/preferences` and `icewm-vnc/keys`.

Kitty remains the default terminal, using your usual Kitty configuration with
X11, 11-point text, and visible window decorations overridden by the VNC
launchers. This font size is scaled by the remote desktop DPI; at 144 DPI,
11 points is approximately 22 pixels. These launch options leave Niri terminals
unchanged and also apply to Rofi's terminal command.
The session clears the inherited `SHELL_ENV_LOADED` guard before starting IceWM
and Kitty, allowing each new shell to load `~/.zshenv` and rebuild its tool paths.
New Kitty windows start maximized. The **iPad Latte** theme uses Kitty's light
Catppuccin Latte window decorations with a dark taskbar matching Waybar.
The bar uses Macchiato crust (`#181926`), with pale text (`#cad3f5`) and a
Macchiato base desktop background (`#24273a`). Window controls are flat, with
a simple app-grid launcher and Sarasa UI SC text matching Waybar. The fallback font list is Font Awesome 7
Free, then sans-serif. Title text is 12-point, menus 11-point, and the taskbar 10-point,
with a 41-pixel taskbar and 32-pixel title bars at the initial resolution.
The clock fills the bar's 40-pixel content row and uses the desktop background
color; `TaskBarGraphHeight=40` prevents dark padding above and below it.
Spaces in `TimeFormat` add horizontal padding around the clock text.
Mauve accents follow Niri: `#c6a0f6` and `#8839ef`, with `#8e8bb6`
for inactive borders. Focused task buttons use Waybar's 50% mauve tint,
blended over the dark taskbar into `#6f5d8e`, with light text. The bar uses
solid colors rather than Waybar's transparency.
IceWM uses solid accents here instead of Niri's focus-ring gradient.
Font and size overrides live in `icewm-vnc/prefoverride`.
The theme and its decoration assets live in
`icewm-vnc/themes/ipad-latte/`, included through the directory link.

## Maintenance

### Resolution when switching clients

The server accepts viewer resize requests (`AcceptSetDesktopSize=1`). TigerVNC
Viewer can request a laptop-sized desktop with `RemoteResize=1`; remove any
previous `RemoteResize=0` override to use this. Jump Desktop's VNC connection
keeps the existing server resolution.

`ipad-vnc-resolution` checks this Xvnc process's IPv4 TCP connections every
250 ms. Once no viewer has been connected for half a second, it restores
`VNC_GEOMETRY` (1600×1200 by default) with `xrandr`, using the configured
`VNC_DPI`. Disconnect the laptop and wait about a second before connecting the
iPad. Pending authentication also counts as a connection. Brief reconnects or
overlapping connections keep the current size; the helper never deliberately
resets while another viewer remains connected.

All connected viewers share one desktop resolution. DPI stays at 144 unless
you change `VNC_DPI`; requesting a different resolution does not provide
independent per-client font scaling. Resizing preserves running applications,
though the window manager may rearrange windows to fit the new screen.

### Display scale

`icewm-vnc/environment` sets `VNC_DPI=144` (150% relative to
96 DPI). Use `120` for 125%, `168` for 175%, or `192` for 200%.
The directory link exposes this file at `~/.config/icewm-vnc/environment`.
The session sets Xvnc DPI, the display's `Xft.dpi` resource, and XSettings
`Xft/DPI` together, so Xft, GTK, and Qt applications receive the same font DPI.
The settings daemon is scoped to VNC display `:1`; Niri and shared Kitty
configuration are unaffected. Applications can interpret DPI differently,
and IceWM's fixed pixel-sized controls are not automatically scaled.

After changing the value, save remote work and restart `ipad-vnc.service`.
Reopening an application may be required after a live DPI adjustment.
For display scaling details, see [Qt's X11 DPI documentation](https://doc.qt.io/qt-6/highdpi.html#configuring-x11)
and [GTK font DPI](https://docs.gtk.org/gtk3/property.Settings.gtk-xft-dpi.html).

### Service commands

```sh
systemctl --user status ipad-vnc
journalctl --user -u ipad-vnc -n 80 --no-pager
systemctl --user restart ipad-vnc
systemctl --user stop ipad-vnc
vncpasswd ~/.config/tigervnc/passwd
```

After editing IceWM preferences, reload just the window manager without closing
applications:

```sh
DISPLAY=:1 XAUTHORITY="$XDG_RUNTIME_DIR/ipad-vnc/Xauthority" icesh restart
```

Restarting the service closes the remote desktop's running applications. To
change initial and fallback resolution, write `VNC_GEOMETRY=1920x1440` to
`~/.config/icewm-vnc/environment`, then restart. `VNC_INTERFACE` can also be set in
that file; changing networks requires updating the firewall rule accordingly.

To disable remote access:

```sh
systemctl --user disable --now ipad-vnc
sudo ufw delete allow in on wlan0 from 10.31.0.0/16 to any port 5901 proto tcp
```

Linger is shared by all user services. Disable it with
`sudo loginctl disable-linger "$USER"` only if no other service needs it.

References: [TigerVNC Xvnc](https://tigervnc.org/doc/Xvnc.html),
[IceWM](https://ice-wm.org/man/icewm.html).
