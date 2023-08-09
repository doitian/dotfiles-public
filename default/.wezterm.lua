local wezterm = require("wezterm")

local function dynamic(config)
  local appearance = wezterm.gui and wezterm.gui.get_appearance() or "Light"
  if appearance:find("Dark") then
    config.color_scheme = "Catppuccin Mocha"
    config.window_background_gradient = nil
    config.set_environment_variables.TERM_BACKGROUND = "dark"
  end

  return config
end

return dynamic({
  -- required by vim clipboard editor
  quit_when_all_windows_are_closed = true,
  send_composed_key_when_right_alt_is_pressed = true,

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
    TERM_BACKGROUND = "light",
    PATH = table
      .concat({
        os.getenv("PATH"),
        "/usr/local/bin",
        "~/bin",
        "~/codebase/gopath/bin",
        "~/.cargo/bin",
        "~/.asdf/bin",
        "~/.node-packages/bin",
        "~/.local/share/nvim/mason/bin",
      }, ":")
      :gsub("%~", wezterm.home_dir),
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
    {
      key = "-",
      mods = "ALT",
      action = wezterm.action.SendString("–"),
    },
    {
      key = "_",
      mods = "ALT|SHIFT",
      action = wezterm.action.SendString("—"),
    },
    {
      key = "[",
      mods = "ALT",
      action = wezterm.action.SendString("“"),
    },
    {
      key = "{",
      mods = "ALT|SHIFT",
      action = wezterm.action.SendString("”"),
    },
    {
      key = "]",
      mods = "ALT",
      action = wezterm.action.SendString("‘"),
    },
    {
      key = "}",
      mods = "ALT|SHIFT",
      action = wezterm.action.SendString("’"),
    },
    {
      key = "8",
      mods = "ALT",
      action = wezterm.action.SendString("•"),
    },
  },
})
