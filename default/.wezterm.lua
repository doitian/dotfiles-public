local wezterm = require("wezterm")
local config = {}

config.color_scheme = "Catppuccin Latte"
config.font_size = 15
config.font = wezterm.font_with_fallback({
  "CartographCF Nerd Font",
  "JetBrains Mono Nerd Font",
  "Cartograph CF",
  "JetBrains Mono",
})

config.hide_tab_bar_if_only_one_tab = true

config.window_frame = {
  font_size = 12,
}

config.window_padding = {
  left = 2,
  right = 0,
  top = 2,
  bottom = 0,
}

config.initial_rows = 36
config.initial_cols = 90

config.keys = {
  {
    key = "p",
    mods = "CMD|SHIFT",
    action = wezterm.action.ActivateCommandPalette,
  },
  {
    key = "d",
    mods = "CMD",
    action = wezterm.action.SplitHorizontal,
  },
  {
    key = "d",
    mods = "CMD|SHIFT",
    action = wezterm.action.SplitVertical,
  },
  {
    key = "w",
    mods = "CMD",
    action = wezterm.action.CloseCurrentPane({ confirm = true }),
  },
}

return config
