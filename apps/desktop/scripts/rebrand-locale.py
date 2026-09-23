"""One-off rebrand helper: swap user-visible 'Hermes' for 'CommonAgent'
inside string literals of the desktop English locale, leaving functional
tokens (hermes://, ~/.hermes, CLI/env identifiers) untouched."""
import re
import sys

path = sys.argv[1]
s = open(path, encoding="utf-8").read()
string_re = re.compile(r"'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"")
count = 0


def repl(m):
    global count
    inner = m.group(0)
    hits = re.findall(r"\bHermes\b", inner)
    # skip strings that also contain functional lowercase 'hermes' tokens
    # only when the Hermes word is part of an identifier/path
    n = re.sub(r"\bHermes\b", "CommonAgent", inner)
    if n != inner:
        count += len(hits)
    return n


s = string_re.sub(repl, s)
open(path, "w", encoding="utf-8", newline="").write(s)
print("replacements:", count)
