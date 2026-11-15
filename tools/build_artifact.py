#!/usr/bin/env python3
"""Bundle the game into the single-file form used by the Claude artifact.

Usage: python3 tools/build_artifact.py [output.html]
The repo files (index.html, css/, js/) are the source. This only glues them together.
"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
index = (root / 'index.html').read_text()
title = re.search(r'<title>(.*?)</title>', index).group(1)
font = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">', index).group(1)
body = index.split('<body>')[1].split('<script src=')[0].strip()
order = re.findall(r'<script src="js/([^"]+)"></script>', index)
parts = []
for name in order:
    text = (root / 'js' / name).read_text()
    assert text.startswith("'use strict';\n")
    parts.append(text[len("'use strict';\n"):].strip())
js = "(() => {\n'use strict';\n\n" + "\n\n".join(parts) + "\n})();"
css = (root / 'css' / 'style.css').read_text().strip()
out = (f'<meta name="claude:viewport-fit-sides" content="cover">\n<title>{title}</title>\n'
       f'<link rel="stylesheet" href="{font}">\n<style>\n{css}\n</style>\n\n{body}\n\n<script>\n{js}\n</script>\n')
dest = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'dist' / 'artifact.html'
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out)
print('wrote', dest, len(out), 'bytes')
