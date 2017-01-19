export PATH=$(echo "$PATH" | sed 's;^\(.*\):\.git\(.*\):/PATH:;.git\2:/PATH:\1:;')
