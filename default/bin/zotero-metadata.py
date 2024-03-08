#!/usr/bin/env python3

from datetime import datetime
import http.client
import json
import re
from urllib.parse import urlparse

def safe_file_name(title):
    # Remove colons
    title = title.replace(":", "")

    # Replace special characters with hyphens
    title = re.sub(r'[/\\?%*|"<>]', '-', title)

    # Remove trailing spaces, periods, and hyphens
    title = re.sub(r'[ \.\-]+$', '', title)

    return title


def parse_date(date_parts):
    # Extract the year and month from the JSON
    year = int(date_parts[0])
    month = date_parts[1] if len(date_parts) > 1 else 1
    day = date_parts[2] if len(date_parts) > 2 else 1

    date_obj = datetime(year, month, day)

    return date_obj.date().isoformat()[:10]


conn = http.client.HTTPConnection("127.0.0.1:23119")

conn.request(
    "GET", "/better-bibtex/cayw?selected=1&format=translate&translator=csljson"
)

res = conn.getresponse()
data = res.read()

item = json.loads(data.decode("utf-8"))[0]
authors = [f"{a["given"]} {a["family"]}" for a in item["author"]]
first_author = safe_file_name(item["author"][0]["family"])
author_etal =  first_author if len(authors) == 1 else f"{first_author} et al."
date = parse_date(item["issued"]["date-parts"][0])
now = datetime.now().isoformat()[:10]

print("---")
print(f"aliases: [{item['id']}]")
print("---")
print(f"# {author_etal} - {safe_file_name(item['title'])} (Annotations)\n")
print("## Metadata\n")
print("**Source**:: #from/zotero")
print("**Zettel**:: #zettel/fleeting")
print("**Status**:: #x")
print(f"**Authors**:: [[{']], [['.join(authors)}]]")
print(f"**Full Title**:: {item['title']}")
print(f"**Category**:: #{item['type']}")
print(f"**Date**:: [[{date}]]")
print(f"**Created**:: [[{now}]]")


if "DOI" in item:
    print(f"**DOI**:: \"{item['DOI']}\"")
if "ISSN" in item:
    print(f"**ISSN**:: \"{item['ISSN']}\"")


if len(item["keywords"]) > 0:
    print(f"**Document Tags**:: #{' #'.join(item['keywords'])}")

if "URL" in item:
    parsed_url = urlparse(item["URL"])
    print(f"**URL**:: [{parsed_url.hostname}]({item['URL']})")

print(f"**Zotero App Link**:: [Open in Zotero](zotero://select/library/items/{item['item-key']})")
print(f"**Zotero Web Link**:: [zotero.org](https://www.zotero.org/users/8290186/items/{item['item-key']})")

print()

if "abstract" in item:
    print("## Abstract\n")
    print(item["abstract"])
    print()

print("## Annotations\n")
