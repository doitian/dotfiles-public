#MISE dir="{{cwd}}"
#MISE depends=["preset:pre-commit"]

mise tasks add pre-commit:cargo-fmt -- cargo fmt --check

if (Get-Command -ErrorAction Ignore cargo-nextest) {
  mise config set tasks.test.run 'cargo nextest run --no-fail-fast{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}'
} else {
  mise config set tasks.test.run 'cargo test --no-fail-fast --{% for f in usage.filters | default(value=[]) %} {{ f }}{% endfor %}'
}
mise config set tasks.test.usage 'arg "[filters]" var=#true'
