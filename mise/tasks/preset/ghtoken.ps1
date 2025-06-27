#MISE dir="{{cwd}}"

mise set GITHUB_TOKEN="{{ exec(command='gh auth token') }}"
