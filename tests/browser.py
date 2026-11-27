"""Browser acceptance tests; local Chromium, real UI/persistence/offline. No external media played."""
import json, pathlib, threading, http.server, functools, time, os
from playwright.sync_api import sync_playwright, expect
ROOT=pathlib.Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
results=[]
ARTIFACTS=ROOT/'docs'/'qa-artifacts'
ARTIFACTS.mkdir(parents=True,exist_ok=True)
def run(name,fn):
    try:fn();results.append({'test':name,'result':'PASS'});print('PASS',name,flush=True)
    except Exception as e:results.append({'test':name,'result':'FAIL','error':str(e)});print('FAIL',name,str(e),flush=True);(ROOT/'docs/browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));raise
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
    context=browser.new_context(viewport={'width':1440,'height':900},permissions=['clipboard-read','clipboard-write','microphone'],accept_downloads=True)
    page=context.new_page();errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:external.append(r.url) if not (r.url.startswith(url) or r.url.startswith('blob:'+url)) else None)
    def nav(hash):
        page.goto(url+'#'+hash);page.wait_for_selector('main h1');expect(page.locator('main h1').first).not_to_have_text('Không tải được khóa học');page.wait_for_timeout(80)
    def g3_home():
        nav('home');expect(page.get_by_text('0/156',exact=True)).to_be_visible();expect(page.get_by_role('link',name='Mở bài học hôm nay →')).to_have_attribute('href','#lesson/1');page.screenshot(path=str(ARTIFACTS/'efw_dashboard_preview.png'),full_page=True)
    run('G3-01 dashboard initial, no fake progress',g3_home)
    def g3_path():
        nav('path');assert page.locator('.day-tile').count()==182;assert page.locator('details[data-week]').count()==26;assert page.locator('.day-tile[href="#lesson/182"]').count()==1
        nav('lesson/2');expect(page.locator('main h1').first).to_have_text('Giới thiệu và làm quen');expect(page.get_by_text('Talking about your job',exact=False).first).to_be_visible();expect(page.locator('[data-action="copy-task:T001"]')).to_be_visible();assert page.locator('main a[href^="https://"]').count()>2
    run('G3-02 all 182 days and linked daily resources',g3_path)
    def g3_save():
        page.locator('#check-listen').check();page.locator('[data-day-field="notes"]').fill('Listen to endings <script>alert(1)</script>');page.locator('[data-day-field="writing"]').fill('I work on software.');page.locator('[data-day-field="coreMin"]').fill('42');page.locator('[data-day-field="vocabMin"]').fill('12');page.reload();expect(page.locator('#check-listen')).to_be_checked();expect(page.locator('[data-day-field="notes"]')).to_have_value('Listen to endings <script>alert(1)</script>');expect(page.locator('[data-day-field="writing"]')).to_have_value('I work on software.');expect(page.locator('[data-day-field="coreMin"]')).to_have_value('42');expect(page.locator('[data-day-field="vocabMin"]')).to_have_value('12');page.locator('[data-action="copy-task:T001"]').click();expect(page.locator('#toast')).to_contain_text('Đã sao chép');assert 'Introduce yourself' in page.evaluate('navigator.clipboard.readText()')
        page.screenshot(path=str(ARTIFACTS/'efw_lesson_preview.png'),full_page=False)
    run('G3-03 actual save/reload, safe draft, clipboard',g3_save)
    def g3_b2():
        rs=json.loads((ROOT/'data/resources.json').read_text());alt=next(r for r in rs if r[2].startswith('Thay B2'));day=int(alt[0][1:]);orig=next(r for r in rs if r[0]==alt[0] and r[2]==alt[2].split(' · ')[1] and r[4]=='B2');nav('lesson/'+str(day));assert page.locator(f'main a[href="{alt[7]}"]').count()>=1;assert page.locator(f'main a[href="{orig[7]}"]').count()==0;page.locator('[data-setting="advanced"]').check();assert page.locator(f'main a[href="{orig[7]}"]').count()>=1;page.locator('[data-setting="advanced"]').uncheck();nav('lesson/6');assert page.locator('main a[href="#assessment/1"]').count()==1;exam=next(r for r in rs if r[0]=='D006' and r[2]=='Nghe kiểm tra chưa luyện');assert page.locator(f'main a[href="{exam[7]}"]').count()==0
    run('G3-04 B2 fallback and assessment content isolation',g3_b2)
    def g3_record_timer():
        nav('lesson/2');page.locator('#record-start').click();expect(page.locator('#record-stop')).to_be_enabled(timeout=5000);page.wait_for_timeout(600);page.locator('#record-stop').click();expect(page.locator('#record-output audio')).to_be_visible(timeout=5000);assert page.locator('#record-output a[download]').count()==1;page.locator('[data-action="timer-start:core"]').click();expect(page.locator('#timer-display')).to_contain_text('D002');page.locator('[data-action="timer-stop"]').click();expect(page.locator('#timer-display')).to_have_text('00:00')
    run('G3-05 recorder with fake microphone and timer control',g3_record_timer)
    def g4_flash():
        nav('vocab/today/1');expect(page.locator('#flashcard')).to_be_visible();expect(page.locator('#reveal')).to_be_visible();assert page.locator('[data-rating]').count()==0;page.locator('#reveal').click();expect(page.locator('#flashcard')).to_contain_text('là, ở, thì');page.locator('[data-rating="0"]').click();nav('vocab/due/1');expect(page.locator('#flashcard')).to_contain_text('be');page.locator('#reveal').click();page.locator('[data-rating="3"]').click();nav('vocab/weak/1');expect(page.locator('#vocab-content')).to_contain_text('Không có thẻ');page.reload();nav('vocab/library/1');expect(page.get_by_text('1390 mục',exact=True)).to_be_visible();page.locator('#vocab-search').fill('deadline');expect(page.locator('#library-results')).to_contain_text('deadline');page.locator('#vocab-search').fill('V1000');expect(page.locator('#library-results')).to_contain_text('V1000');page.locator('#vocab-search').fill('');page.locator('#card-type').select_option('phrase');expect(page.get_by_text('390 mục',exact=True)).to_be_visible();page.locator('#card-type').select_option('word');expect(page.get_by_text('1000 mục',exact=True)).to_be_visible();page.locator('#card-type').select_option('all')
    run('G4-01 reveal/rate, due/weak persistence, full library/search',g4_flash)
    def g4_quiz():
        nav('vocab/quiz/1');assert page.locator('[data-action^="quiz-choice:"]').count()==4;page.locator('[data-action^="quiz-choice:"]').first.click();expect(page.locator('[data-action="quiz-next"]')).to_be_visible();page.locator('[data-action="quiz-next"]').click();page.locator('#quiz-kind').select_option('spelling');expect(page.locator('#quiz-spelling')).to_be_visible();page.locator('#quiz-spelling').fill('wrong_answer');page.locator('[data-action="quiz-spell"]').click();expect(page.locator('#vocab-content')).to_contain_text('Chưa đúng')
    run('G4-02 meaning/spelling quiz feedback',g4_quiz)
    def g5_score():
        nav('assessment/26');expect(page.locator('main')).to_contain_text('nghe ≥8/10');expect(page.locator('#grade-result')).to_contain_text('Chưa đủ điểm');page.locator('#exam-details summary').click();expect(page.locator('#exam-details')).to_contain_text('3. Viết');page.locator('[data-score-field="writing"]').fill('We finished the test.');
        for i,v in enumerate([8,7,8,8,8]):page.locator(f'[data-score="{i}"]').fill(str(v))
        expect(page.locator('#grade-result')).to_have_text('Đạt · 76.5/100');page.locator('[data-score="0"]').fill('7');expect(page.locator('#grade-result')).to_contain_text('Cần ôn lại');page.locator('[data-score="0"]').fill('11');expect(page.locator('#grade-result')).to_contain_text('Điểm không hợp lệ');page.locator('[data-score="0"]').fill('8');page.reload();expect(page.locator('#grade-result')).to_contain_text('Đạt');page.locator('#exam-details summary').click();expect(page.locator('[data-score-field="writing"]')).to_have_value('We finished the test.')
    run('G5-01 final assessment thresholds, invalid and persisted writing',g5_score)
    def g5_backup():
        nav('progress');page.locator('#new-error').fill('Final consonants');page.locator('[data-action="add-error"]').click();expect(page.locator('main')).to_contain_text('Final consonants');
        with page.expect_download() as dl:page.locator('[data-action="export"]').click()
        backup=dl.value.path();obj=json.loads(backup.read_text());assert obj['days']['D002']['coreMin']==42 and obj['scores']['26']['values'][0]==8;page.locator('#backup-file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':b'{"version":2}'});expect(page.locator('#toast')).to_contain_text('Không nhập được');assert page.get_by_text('Final consonants',exact=True).is_visible();page.once('dialog',lambda dialog:dialog.accept());page.locator('#backup-file').set_input_files(str(backup));expect(page.locator('#toast')).to_contain_text('Đã khôi phục');nav('lesson/2');expect(page.locator('[data-day-field="coreMin"]')).to_have_value('42')
    run('G5-02 exported real progress, invalid backup rejection, import roundtrip',g5_backup)
    def g6_desktop_mobile():
        for vp in [{'width':1440,'height':900},{'width':390,'height':844},{'width':320,'height':700}]:
            page.set_viewport_size(vp)
            for h in ['home','path','lesson/2','lesson/181','vocab/library/1','assessment/26','progress','sources']:
                nav(h);assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),(vp,h,page.evaluate('document.documentElement.scrollWidth'),page.evaluate('Array.from(document.querySelectorAll("main *")).filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right])'))
        page.set_viewport_size({'width':390,'height':844});nav('home');page.screenshot(path=str(ARTIFACTS/'efw_mobile_preview.png'),full_page=True);assert errors==[],errors;assert external==[],external
    run('G6-01 desktop, 390px, 320px all routes no overflow/errors/external requests',g6_desktop_mobile)
    def g6_offline():
        nav('home');page.evaluate('navigator.serviceWorker.ready');page.wait_for_function('navigator.serviceWorker.controller !== null',timeout=10000);context.set_offline(True);page.reload();expect(page.get_by_role('link',name='Mở bài học hôm nay →')).to_be_visible(timeout=10000);nav('vocab/library/1');expect(page.get_by_text('1390 mục',exact=True)).to_be_visible();context.set_offline(False)
    run('G6-02 offline after cache, course and vocabulary still accessible',g6_offline)
    browser.close()
server.shutdown();(ROOT/'docs/browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(f'{len(results)} browser acceptance tests passed')
