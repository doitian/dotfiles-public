#MISE dir="{{cwd}}"

Add-Content mise.toml $null
mise config set env._.path '{{config_root}}/node_modules/.bin' -t list
