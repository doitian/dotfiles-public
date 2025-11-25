#MISE dir="{{cwd}}"
#MISE depends=["preset:pre-commit"]

mise tasks add pre-commit:cargo-fmt -- cargo fmt --check

if (Get-Command -ErrorAction Ignore cargo-nextest) {
  mise config set tasks.test.run 'cargo nextest run --no-fail-fast ${usage_filters}'
} else {
  mise config set tasks.test.run 'cargo test --no-fail-fast -- ${usage_filters}'
}
mise config set tasks.test.usage 'arg "[filters]" var=#true'
