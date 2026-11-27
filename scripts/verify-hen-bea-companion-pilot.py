"""Validate exact pilot site layout and manifest hashes before any deployment."""
import hashlib,json,re,sys,zipfile
from pathlib import Path
SHA=lambda b:hashlib.sha256(b).hexdigest()
ID='hb-ac23a99e42eee2c856dda344aa45877a'
prefix=f'play/{ID}/'
source,dest=map(Path,sys.argv[1:])
pages={f'pages/{i:02d}.jpg' for i in [*range(36),39,40]}
allowed={'_headers','index.html',prefix+'index.html',prefix+'publication.json'}|{prefix+p for p in pages}
with zipfile.ZipFile(source) as z:
    assert len(z.namelist())==len(allowed) and set(z.namelist())==allowed
    assert sum(i.file_size for i in z.infolist())<20_000_000
    r=json.loads(z.read(prefix+'publication.json'))
    assert r['bookId']==ID and r['status']=='pilot' and r['url']=='https://hen-bea-activity-books.netlify.app/'+prefix
    assert r['manifestHash']=='6637bb6902af4e28bb9a8307cc82c379da1d1991bd05259fec0f6d15b7ce0814'
    assert r['interiorHash']=='3512136f118419898f42f037cfe0ddc07924a37197c09970b942c3f9b5318095'
    assert r['interactiveHash']==SHA(z.read(prefix+'index.html'))=='c26ffc578c0bb7bc5184639b9adb4cfbcee64658e5b6a3deff298b4e38d972df'
    assert set(r['pages'])==pages
    for p in pages:assert SHA(z.read(prefix+p))==r['pages'][p]
    headers=z.read('_headers').decode()
    assert "connect-src 'none'" in headers and "frame-ancestors 'none'" in headers and 'noindex' in headers
    for name in sorted(allowed):
        path=dest/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(z.read(name))
print('Validated exactly 42 companion site files; no source ZIP, print PDFs or font binaries.')
