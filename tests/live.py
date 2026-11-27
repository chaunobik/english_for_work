"""Verify the production URL after deploy. No simulated data or external resource playback."""
import json, os, pathlib, time, urllib.request
from urllib.parse import urljoin
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
base=os.environ['SITE_URL'].rstrip('/')+'/'
assert base.startswith('https://'),base
paths=['index.html','style.css','app.js','core.js','sw.js','manifest.webmanifest','icon.svg']+[str(p.relative_to(ROOT)) for p in sorted((ROOT/'data').glob('*.json'))]
for attempt in range(10):
    try:
        for rel in paths:
            req=urllib.request.Request(urljoin(base,rel)+'?qa='+str(time.time_ns()),headers={'Cache-Control':'no-cache','User-Agent':'EnglishForWorkReleaseQA/1.0'})
            with urllib.request.urlopen(req,timeout=20) as r:
                assert r.status==200,rel
                assert r.read()==(ROOT/rel).read_bytes(),f'Stale or mismatched deployed file: {rel}'
        break
    except Exception:
        if attempt==9:raise
        time.sleep(5)
print(f'PASS G7-01: {len(paths)} deployed assets byte-identical',flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(base+'#home',wait_until='load')
    expect(page.get_by_text('0/156',exact=True)).to_be_visible(timeout=20000)
    page.get_by_role('link',name='Mở bài học hôm nay →').click()
    expect(page.locator('main h1')).to_have_text('Giới thiệu và làm quen')
    page.locator('#check-listen').check()
    page.reload()
    expect(page.locator('#check-listen')).to_be_checked()
    page.goto(base+'#vocab/library/1')
    expect(page.get_by_text('1390 mục',exact=True)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    assert errors==[],errors
    browser.close()
print('PASS G7-02: production URL, daily lesson, persisted checklist, vocabulary and mobile',flush=True)
