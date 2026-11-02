"""Maintenance helper for Onslaught Logbook.

  python3 tools/build.py decrypt --key KEY --out /tmp/program.json   # program.enc.json -> plaintext (keep it OUT of the repo)
  python3 tools/build.py encrypt --key KEY --program /tmp/program.json  # plaintext -> program.enc.json
  python3 tools/build.py sw                                            # refresh sw.js (cache version + asset list)

Run `sw` after changing any shipped file so installed phones pick up the update.
Requires: pip install cryptography
"""
import argparse, base64, hashlib, json, os, secrets

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENC = os.path.join(ROOT, 'program.enc.json')
ITER = 600000


def norm(key):
    return ''.join(c for c in key.upper() if c.isalnum())


def decrypt(key, out):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    enc = json.load(open(ENC))
    k = hashlib.pbkdf2_hmac('sha256', norm(key).encode(), base64.b64decode(enc['salt']), enc['iter'], dklen=32)
    plain = AESGCM(k).decrypt(base64.b64decode(enc['iv']), base64.b64decode(enc['data']), None)
    open(out, 'wb').write(plain)
    print('wrote', out)


def encrypt(key, program):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    data = json.load(open(program, encoding='utf-8'))
    plain = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    salt, iv = secrets.token_bytes(16), secrets.token_bytes(12)
    k = hashlib.pbkdf2_hmac('sha256', norm(key).encode(), salt, ITER, dklen=32)
    enc = {'v': 1, 'rev': hashlib.sha256(plain).hexdigest()[:12], 'kdf': 'PBKDF2-SHA256', 'iter': ITER,
           'salt': base64.b64encode(salt).decode(), 'iv': base64.b64encode(iv).decode(),
           'data': base64.b64encode(AESGCM(k).encrypt(iv, plain, None)).decode()}
    json.dump(enc, open(ENC, 'w'), separators=(',', ':'))
    print('wrote program.enc.json rev', enc['rev'])


def sw():
    assets = ['./', 'index.html', 'app.js', 'app.css', 'program.enc.json', 'manifest.webmanifest', 'fonts/fonts.css']
    assets += ['fonts/' + f for f in sorted(os.listdir(os.path.join(ROOT, 'fonts'))) if f.endswith('.woff2')]
    assets += ['icons/' + f for f in sorted(os.listdir(os.path.join(ROOT, 'icons')))]
    h = hashlib.sha256()
    for a in assets[1:]:
        h.update(open(os.path.join(ROOT, a), 'rb').read())
    version = 'onslaught-' + h.hexdigest()[:10]
    path = os.path.join(ROOT, 'sw.js')
    src = open(path).read()
    import re
    src = re.sub(r"const VERSION = '[^']*';", "const VERSION = '%s';" % version, src)
    src = re.sub(r"const ASSETS = \[.*?\];", 'const ASSETS = %s;' % json.dumps(assets), src, flags=re.S)
    open(path, 'w').write(src)
    print('sw.js version', version)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['decrypt', 'encrypt', 'sw'])
    ap.add_argument('--key')
    ap.add_argument('--out', default='/tmp/program.json')
    ap.add_argument('--program', default='/tmp/program.json')
    a = ap.parse_args()
    if a.cmd == 'decrypt': decrypt(a.key, a.out)
    elif a.cmd == 'encrypt': encrypt(a.key, a.program); sw()
    else: sw()
