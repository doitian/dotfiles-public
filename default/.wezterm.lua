local wezterm = require("wezterm")

local config = {
  quit_when_all_windows_are_closed = false,

  color_scheme = "Catppuccin Latte",
  colors = {
    tab_bar = {
      inactive_tab_edge = "#6B5294",
    },
  },

  window_background_gradient = {
    colors = { "#F1E7FD", "#EFF1F5" },
    orientation = { Radial = { cx = 1.5, cy = 2, radius = 1.75 } },
  },

  font = wezterm.font_with_fallback({
    "Cartograph CF",
    "LXGW Bright GB",
  }),
  font_size = 16,

  initial_rows = 36,
  initial_cols = 90,
  hide_tab_bar_if_only_one_tab = true,
  window_frame = {
    font = wezterm.font_with_fallback({
      "Artifex Hand CF",
      "LXGW Bright GB",
    }),
    font_size = 15,
  },
  window_padding = {
    left = 0,
    right = 0,
    top = 0,
    bottom = 0,
  },

  set_environment_variables = {
    LAZY = "1",
    PATH = os.getenv("PATH") .. ":" .. wezterm.home_dir .. "/bin:/usr/local/bin",
  },
  skip_close_confirmation_for_processes_named = {
    "bash",
    "sh",
    "zsh",
    "cmd.exe",
    "pwsh.exe",
    "powershell.exe",
    "tmux",
    "btop",
    "man",
  },
  launch_menu = {
    {
      args = { "btop" },
    },
    {
      args = { "bash", "-l" },
    },
    {
      args = { "tmux-launcher" },
    },
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
    {
      key = "Enter",
      mods = "ALT",
      action = wezterm.action.DisableDefaultAssignment,
    },
  },
}

return config
