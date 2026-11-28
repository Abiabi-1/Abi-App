"""Turns the old Day End page stylesheet (captured from the old app) into one that works inside a shadow root.
html / :root  ->  :host     body  ->  .de-body     html[x]:not(y)  ->  :host([x]:not(y))
Usage: python3 scope_old_css.py old_day.css ../src/sections/dayend-old.css"""
import re, sys
src = open(sys.argv[1]).read()

def tr_selector(sel):
    s = sel
    # html / :root with attribute or :not() chains -> :host(...)
    s = re.sub(r'(?<![\w-])(?:html|:root)((?:\[[^\]]*\]|:not\((?:[^()]|\([^()]*\))*\))+)', lambda m: ':host(' + m.group(1) + ')', s)
    s = re.sub(r'(?<![\w-])(?:html|:root)(?![\w-])', ':host', s)
    s = re.sub(r'(?<![\w.#-])body(?![\w-])', '.de-body', s)
    # ":host .de-body" chains and "html body" -> keep (the wrapper is .de-body)
    s = re.sub(r':host\s+:host', ':host', s)
    # a bare [data-theme..] at the start of a compound selector refers to the document root in the old page
    s = re.sub(r'(^|,)\s*(\[data-(?:theme|pal|calm)[^\]]*\])', lambda m: m.group(1) + ':host(' + m.group(2) + ')', s)
    return s

out, i, n = [], 0, len(src)
# walk the text: anything followed by "{" that is not an at-rule prelude is a selector list
buf = ''
depth_stack = []
pos = 0
for m in re.finditer(r'/\*.*?\*/|[{}]', src, re.S):
    tok = m.group(0)
    if tok.startswith('/*'):
        continue
    chunk = src[pos:m.start()]
    if tok == '{':
        pre = chunk
        stripped = pre.strip()
        # remove comments inside the prelude
        clean = re.sub(r'/\*.*?\*/', '', pre, flags=re.S)
        if clean.strip().startswith('@'):
            out.append(clean)
        else:
            # split the declarations part of the parent (after last ';') – chunk may contain "decl; decl; selector"
            k = clean.rfind(';')
            head, sel = (clean[:k + 1], clean[k + 1:]) if k >= 0 else ('', clean)
            out.append(head + tr_selector(sel))
        out.append('{')
    else:
        out.append(re.sub(r'/\*.*?\*/', '', chunk, flags=re.S)); out.append('}')
    pos = m.end()
out.append(src[pos:])
css = ''.join(out)
css = css.replace('/*----*/', '')
# the palette tokens come from the app (inline on the host); drop the hard-coded defaults so palettes apply
css = re.sub(r':host\s*\{\s*--t0:#5a0511;[^}]*\}', '', css)
# the old page sized itself to the window; inside the app it fills the host
css += '\n:host{display:block}\n'
open(sys.argv[2], 'w').write(css)
print('written', len(css))
