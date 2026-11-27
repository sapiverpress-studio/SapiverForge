"""Build the exact public companion from an approved original Worksheet Forge ZIP.
No print PDFs, manifest, Etsy files or embedded fonts are returned.
"""
import argparse, base64, hashlib, json, re, stat, zipfile
from pathlib import Path
from html.parser import HTMLParser

ORIGIN = 'https://suite.sapiverpress.co.uk'
PAGES = [f'pages/{i:02d}.jpg' for i in [*range(36), 39, 40]]
SHA = lambda b: hashlib.sha256(b).hexdigest()
HEX = re.compile(r'^[a-f0-9]{64}$')

class HtmlCheck(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.scripts = 0
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in {'iframe','frame','object','embed','base','form','link','a'} or (tag=='meta' and 'http-equiv' in a):
            raise ValueError('Unexpected active HTML element')
        if any(k.startswith('on') for k in a): raise ValueError('Inline event handler')
        if tag == 'script':
            self.scripts += 1
            if attrs: raise ValueError('External or unexpected script')
        for key in ('src','href','action','srcset','poster'):
            if key in a and a[key] and not re.fullmatch(r'pages/(?:0[0-9]|[12][0-9]|3[0-5]|39|40)\.jpg',a[key]):
                raise ValueError('Unexpected resource URL')


def package(source, expected_hash):
    source = Path(source)
    if not HEX.fullmatch(expected_hash) or source.stat().st_size > 100_000_000: raise ValueError('Invalid archive approval')
    if SHA(source.read_bytes()) != expected_hash: raise ValueError('Approved archive hash differs')
    with zipfile.ZipFile(source) as z:
        entries=z.infolist(); seen=set(); total=0
        if len(entries)>100: raise ValueError('Too many ZIP entries')
        for e in entries:
            n=e.filename; key=n.casefold(); parts=n.rstrip('/').split('/')
            mode=e.external_attr>>16; kind=stat.S_IFMT(mode)
            if key in seen or n.startswith('/') or '\\' in n or any(x in ('','.','..') for x in parts) or any(ord(c)<32 for c in n) or kind not in (0,stat.S_IFREG,stat.S_IFDIR) or e.flag_bits&1 or e.compress_type not in (zipfile.ZIP_STORED,zipfile.ZIP_DEFLATED): raise ValueError('Unsafe archive entry')
            seen.add(key);total+=e.file_size
            if e.file_size>50_000_000 or total>200_000_000 or e.file_size/max(1,e.compress_size)>100: raise ValueError('Archive expansion exceeds limits')
        m=z.read('BOOK_PLAN.json'); interior=z.read('KDP/KDP_40_Page_Interior_A4.pdf'); h=z.read('Interactive/index.html')
        if len(m)>2_000_000 or len(h)>2_000_000 or not interior.startswith(b'%PDF-'):raise ValueError('Invalid companion inputs')
        plan=json.loads(m)
        if not isinstance(plan.get('title'),str) or not re.fullmatch(r'\d{1,2}[-–]\d{1,2}',plan.get('age','')) or [p['page'] for p in plan['pages']]+plan['endMatter']!=list(range(1,41)):raise ValueError('Invalid 40-page book plan')
        html=h.decode('utf-8'); parser=HtmlCheck();parser.feed(html);parser.close()
        scripts=re.findall(r'<script>(.*?)</script>',html,re.S)
        if parser.scripts!=1 or len(scripts)!=1 or not html.startswith('<!doctype html>') or 'Hen &amp; Bea — Activity Book' not in html:raise ValueError('Unexpected companion HTML')
        mh,ih=SHA(m),SHA(interior);book_id='hb-'+SHA(f'sapiver-book-v1\n{mh}\n{ih}'.encode())[:32]
        assets={'index.html':h}
        for name in PAGES:
            raw=z.read('Interactive/'+name)
            if len(raw)>5_000_000 or not raw.startswith(b'\xff\xd8') or not raw.endswith(b'\xff\xd9'):raise ValueError('Invalid companion JPEG')
            assets[name]=raw
        receipt={'bookId':book_id,'manifestHash':mh,'interiorHash':ih,'interactiveHash':SHA(h),'url':f'{ORIGIN}/activity-books/{book_id}/','pages':{n:SHA(assets[n]) for n in PAGES},'scriptHash':base64.b64encode(hashlib.sha256(scripts[0].encode()).digest()).decode(),'sourceArchiveHash':expected_hash}
        return receipt,assets

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('sha256');p.add_argument('output');a=p.parse_args()
    receipt,assets=package(a.source,a.sha256)
    # Output is private runner staging, not a public website. No approved status is minted here.
    out=Path(a.output);out.mkdir(mode=0o700,parents=True,exist_ok=False)
    (out/'pages').mkdir()
    for n,b in assets.items():(out/n).write_bytes(b)
    (out/'receipt.json').write_text(json.dumps(receipt,separators=(',',':')),encoding='utf-8')
    print('Validated 39 exact companion assets; book ID '+receipt['bookId'])
