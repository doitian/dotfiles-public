local wezterm = require 'wezterm'
local config = {}

config.color_scheme = 'Catppuccin Latte (Gogh)'
config.font_size = 15
config.font = wezterm.font_with_fallback {
  'CartographCF Nerd Font',
  'JetBrains Mono Nerd Font',
  'Cartograph CF',
  'JetBrains Mono',
}

return config
