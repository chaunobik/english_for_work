"""Convert the approved Optimized workbook to static course JSON; no personal inputs."""
import argparse, json, pathlib, re, zipfile, xml.etree.ElementTree as E
from collections import Counter
P=pathlib.Path(__file__).resolve().parents[1]
N={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
def read_xlsx(path):
    with zipfile.ZipFile(path) as z:
        wb=E.fromstring(z.read('xl/workbook.xml')); rr=E.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        links={a.get('Id'):a.get('Target').lstrip('/') for a in rr}; shared=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            shared=[''.join(t.text or '' for t in e.findall('.//x:t',N)) for e in E.fromstring(z.read('xl/sharedStrings.xml')).findall('x:si',N)]
        out={}
        for s in wb.findall('x:sheets/x:sheet',N):
            p=links[s.get(REL)]; p=p if p.startswith('xl/') else 'xl/'+p
            rows=[]
            for row in E.fromstring(z.read(p)).findall('.//x:sheetData/x:row',N):
                idx=int(row.get('r'))
                while len(rows)<idx: rows.append([])
                a=rows[idx-1]
                for c in row.findall('x:c',N):
                    col=0
                    for l in re.match('[A-Z]+',c.get('r')).group():col=col*26+ord(l)-64
                    while len(a)<col:a.append('')
                    typ=c.get('t'); v=c.find('x:v',N); val=v.text if v is not None and v.text is not None else ''
                    if typ=='s':val=shared[int(val)] if val else ''
                    elif typ=='inlineStr':val=''.join(t.text or '' for t in c.findall('.//x:t',N))
                    a[col-1]=val
            out[s.get('name')]=rows
        return out

def build(path):
    s=read_xlsx(path)
    def pick(sheet,pattern,n):return [(r+['']*n)[:n] for r in s[sheet] if r and re.fullmatch(pattern,r[0])]
    d={'lessons':pick('Lịch 182 ngày',r'D\d{3}',13),'resources':pick('Link học liệu',r'D\d{3}',11),'speaking':pick('78 hội thoại',r'T\d{3}',6),'vocabulary':pick('Core Vocabulary 1000',r'V\d{4}',24),'phrases':pick('Cụm từ và ôn tập',r'D\d{3}',11),'reviews':pick('Ôn theo ngày',r'D\d{3}',13),'assessments':pick('Điểm cuối tuần',r'\d+',19),'sources':s['Nguồn và QA'][1:]}
    for r in d['vocabulary']:r[10]='Chưa đánh giá'
    for r in d['reviews']:
        for i in (7,11,12):r[i]=''
    for r in d['assessments']:
        for i in range(5,13):r[i]=''
    return d

def validate(d):
    exp={'lessons':182,'resources':522,'speaking':78,'vocabulary':1000,'phrases':390,'reviews':197,'assessments':26}
    assert all(len(d[k])==v for k,v in exp.items()),{k:len(d[k]) for k in exp}
    days={r[0] for r in d['lessons']}; words={r[0] for r in d['vocabulary']}; phrases={r[10] for r in d['phrases']}; tasks={r[0] for r in d['speaking']}
    assert len(days)==182 and len(words)==1000 and len(phrases)==390 and len(tasks)==78
    assert len({r[3].casefold() for r in d['vocabulary']})==1000
    assert all(r[0]==f'D{i:03}' and int(r[1])==(i-1)//7+1 and int(r[2])==(i-1)%7+1 for i,r in enumerate(d['lessons'],1))
    assert sum(int(r[12]) for r in d['lessons'])==18720 and sum(int(r[12])>0 for r in d['lessons'])==156
    assert all(r[0] in days and r[7].startswith('https://') for r in d['resources'])
    training={r[3] for r in d['resources'] if r[2]!='Nghe kiểm tra chưa luyện'}; exams=[r for r in d['resources'] if r[2]=='Nghe kiểm tra chưa luyện']
    assert len(exams)==26 and not training.intersection(r[3] for r in exams)
    assert len({r[7] for r in exams})==26 and not {r[7] for r in exams}.intersection(r[7] for r in d['resources'] if r[2]!='Nghe kiểm tra chưa luyện')
    for r in d['vocabulary']:
        assert all(r[i] for i in (0,1,3,4,5,6,7,8,9,15,16,18))
        assert [int(x) for x in r[19:24]]==[int(r[1])+i for i in (1,3,7,14,30)]
    assert Counter(int(r[1]) for r in d['vocabulary']).total()==1000
    for r in d['lessons']:
        assert set(re.findall(r'\bT\d{3}\b',r[7]))<=tasks
    assert all(set(re.findall(r'V\d{4}',r[3]+' '+r[5]))<=words and set(re.findall(r'C\d{3}',r[9]))<=phrases for r in d['reviews'])
    assert all(int(r[0])==i and r[13]==f'D{i*7-1:03}' and any(e[0]==r[13] and e[3]==r[2] for e in exams) for i,r in enumerate(d['assessments'],1))
    print('G2 PASS:',exp,'minutes=18720; review events=5000; unique IDs and isolated assessment URLs')
    return exp
if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('workbook');args=a.parse_args();d=build(args.workbook);counts=validate(d)
    (P/'data').mkdir(exist_ok=True)
    for k,v in d.items():(P/'data'/f'{k}.json').write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (P/'docs'/'G2-results.json').write_text(json.dumps({'status':'PASS','counts':counts,'minutes':18720,'review_events':5000},indent=2))
