#MISE dir="{{cwd}}"
#MISE depends=["preset:pre-commit"]

mise tasks add pre-commit:cargo-fmt -- cargo fmt --check

mise config get vars.cargo_test_args *>$null
if ($LASTEXITSTATUS -ne 0) {
  mise config set vars.cargo_test_args ''
}
if (Get-Command -ErrorAction Ignore cargo-nextest) {
  mise tasks add test -- cargo nextest run --no-fail-fast --nocapture '{{vars.cargo_test_args}}'
} else {
  mise tasks add test -- cargo test --no-fail-fast -- --nocapture '{{vars.cargo_test_args}}'
}
