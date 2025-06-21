#MISE dir="{{cwd}}"

Add-Content mise.toml $null
mise config set env._.python.venv.path .venv
mise config set env._.python.venv.create true -t bool
