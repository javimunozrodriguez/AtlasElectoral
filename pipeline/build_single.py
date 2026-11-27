#!/usr/bin/env python3
"""Genera UN solo index.html con todo el código (CSS + JS) en línea, para publicar en GitHub Pages subiendo un único archivo.
Los datos siguen leyéndose de data/ (fetch relativo). Uso: python3 pipeline/build_single.py --out dist/index.html"""
import re, os, argparse
ap = argparse.ArgumentParser(); ap.add_argument('--out', default='dist/index.html'); a = ap.parse_args()
ORDER = ['calc', 'strength', 'dhondt', 'store', 'data', 'map', 'ui', 'dhondt_view', 'main']
def wrap(name, src):
    names = re.findall(r'^export (?:const|function) (\w+)', src, re.M)
    imp = r"from '\./(\w+)\.js(?:\?v=\w+)?';?"
    src = re.sub(r"import \* as (\w+) " + imp, lambda m: f'const {m.group(1)} = NS_{m.group(2)};', src)
    src = re.sub(r"import \{([^}]*)\} " + imp, lambda m: f'const {{{m.group(1)}}} = NS_{m.group(2)};', src)
    src = re.sub(r'^export ', '', src, flags=re.M)
    return f'const NS_{name} = (() => {{\n{src}\nreturn {{{", ".join(names)}}};\n}})();\n'
js = ''.join(wrap(n, open(f'js/{n}.js').read()) for n in ORDER)
assert not re.search(r'^\s*(import|export)\b', js, re.M), 'quedan import/export sin resolver'
html = open('index.html').read()
for old, new in [('<link rel="stylesheet" href="css/app.css?v=3">', '<style>\n' + open('css/app.css').read() + '</style>'),
                 ('<script type="module" src="js/main.js?v=3"></script>', '<script>\n' + js + '</script>')]:
    assert html.count(old) == 1, old; html = html.replace(old, new)
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True); open(a.out, 'w').write(html); print(a.out, round(len(html) / 1024), 'KB')
