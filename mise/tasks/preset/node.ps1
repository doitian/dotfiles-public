#MISE dir="{{cwd}}"
#MISE description="Setup node project"

Add-Content mise.toml $null
mise config set env._.path '{{config_root}}/node_modules/.bin' -t list
