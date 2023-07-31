local wezterm = require("wezterm")

local config = {
  color_scheme = "Catppuccin Latte",

  font = wezterm.font_with_fallback({
    "Cartograph CF",
    "LXGW WenKai",
  }),
  font_size = 15,

  hide_tab_bar_if_only_one_tab = true,

  initial_rows = 36,
  initial_cols = 90,

  window_frame = {
    font_size = 12,
  },
  window_padding = {
    left = 0,
    right = 0,
    top = 0,
    bottom = 0,
  },

  keys = {
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
  },
}

return config
