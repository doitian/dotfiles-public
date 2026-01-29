#MISE dir="{{cwd}}"
#MISE description="Setup git pre-commit hook"

mise tasks add pre-commit:typos -- typos
mise tasks add pre-commit -d 'pre-commit:*'
