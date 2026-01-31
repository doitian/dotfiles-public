#MISE dir="{{cwd}}"
#MISE depends_post=["g:cursor:hook:sync"]
#MISE description="Create cursor:pushover:on:stop task for pushover notifications"

mise tasks add "cursor:pushover:on:stop" -- dash.exe '{{ xdg_config_home }}/mise/scripts/cursor-pushover-on-stop'
