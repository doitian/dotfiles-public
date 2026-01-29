#MISE dir="{{cwd}}"
#MISE description="Setup python project"

Add-Content mise.toml $null
mise config set env._.python.venv.path .venv
mise config set env._.python.venv.create true -t bool
