let _s=@/
%s;^Referred in <a[^>]*>\(.*\)</a>$;**Parent**:: [[\1]];e
%s; <span class="citation"[^>]*>(.*)</span> \(.*\);> \1;e
%s;^<span class="citation"[^>]*>(.*)</span> \(.*\);> \1;e
%s; <span class="citation"[^>]*>(.*)</span>;;e
sil! g;^<span class="citation"[^>]*>(.*)</span>$;d
%s;^<span class="citation"[^>]*>(.*)</span>;;e
%s;<span class="highlight"[^>]*><a href="\([^"]*\)">“\([^”]*\)”</a></span>;\2 [📄](\1);e
%s;<span style="\([^"]*background-color: [^"]*\)">\([^<]*\)</span>;<mark style="\1">\2</mark>;ge
%s;\(^>\( \.[-a-zA-Z0-9]\+\)*\)\@<= \.\([-a-zA-Z0-9]\+\); #\3;ge
%s;<br>;;ge
%s;\\$;;e
%s;!\[\\<img[^\]]*\];![];ge
let @/=_s
unlet _s
nohl
