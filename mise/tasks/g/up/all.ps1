#MISE alias="g:up"
#MISE dir="~"
#MISE depends_post=["g:clean:scoop"]
#MISE description="Update all apps"

scoop update -a

if (Get-Command uv -ErrorAction SilentlyContinue) {
    mise run g:up:uv
}

if (Get-Command bun -ErrorAction SilentlyContinue) {
    mise run g:up:bun
}
