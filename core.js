export const counts={lessons:182,resources:522,speaking:78,vocabulary:1000,phrases:390,reviews:197,assessments:26};
export const dataKeys=[...Object.keys(counts),'sources'];
export const dayId=n=>'D'+String(n).padStart(3,'0');
export const iso=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export function addDays(day,n){const [y,m,d]=day.split('-').map(Number);return iso(new Date(y,m-1,d+n,12));}
export function fresh(){return {version:1,days:{},cards:{},scores:{},settings:{advanced:false,dark:false},lastDay:1,errors:[]};}
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const numeric=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
export function validateCourse(d){
 if(!record(d))throw Error('Dữ liệu khóa học không hợp lệ');
 for(const [k,n] of Object.entries(counts))if(!Array.isArray(d[k])||d[k].length!==n)throw Error(`${k}: cần ${n} dòng`);
 const fields={lessons:13,resources:11,speaking:6,vocabulary:24,phrases:11,reviews:13,assessments:19};
 for(const [k,n] of Object.entries(fields))if(!d[k].every(r=>Array.isArray(r)&&r.length===n&&r.every(v=>typeof v==='string')))throw Error(`${k}: sai cấu trúc`);
 const unique=(k,i)=>new Set(d[k].map(r=>r[i])).size===d[k].length;
 if(!['lessons','speaking','vocabulary','reviews','assessments'].every(k=>unique(k,0))||!unique('phrases',10)||!unique('vocabulary',3))throw Error('Trùng ID/từ');
 if(!d.lessons.every((r,i)=>r[0]===dayId(i+1)&&+r[1]===Math.ceil((i+1)/7)&&+r[2]===i%7+1)||d.lessons.reduce((s,r)=>s+Number(r[12]),0)!==18720||d.lessons.filter(r=>+r[12]>0).length!==156)throw Error('Sai lịch học');
 const ids=new Set(d.lessons.map(r=>r[0])),vs=new Set(d.vocabulary.map(r=>r[0])),cs=new Set(d.phrases.map(r=>r[10])),ts=new Set(d.speaking.map(r=>r[0]));
 if(!d.resources.every(r=>ids.has(r[0])&&safeUrl(r[7])))throw Error('Link/mã ngày không hợp lệ');
 if(!d.vocabulary.every(r=>/^V\d{4}$/.test(r[0])&&[1,3,4,5,6,7,8,9,15,16,18].every(i=>r[i])&&safeUrl(r[15])&&[1,3,7,14,30].every((x,i)=>+r[19+i]===+r[1]+x)))throw Error('Sai từ vựng/lịch ôn');
 if(!d.phrases.every(r=>ids.has(r[0])&&/^C\d{3}$/.test(r[10])&&r[3]))throw Error('Sai cụm từ');
 if(!d.lessons.every(r=>(r[7].match(/\bT\d{3}\b/g)||[]).every(x=>ts.has(x))))throw Error('Thiếu hội thoại');
 if(!d.reviews.every(r=>((r[3]+' '+r[5]).match(/V\d{4}/g)||[]).every(x=>vs.has(x))&&(r[9].match(/C\d{3}/g)||[]).every(x=>cs.has(x))))throw Error('Thiếu mã ôn tập');
 const exam=d.resources.filter(r=>r[2]==='Nghe kiểm tra chưa luyện'),train=d.resources.filter(r=>r[2]!=='Nghe kiểm tra chưa luyện');
 if(exam.length!==26||new Set(exam.map(r=>r[7])).size!==26||exam.some(r=>train.some(t=>t[3]===r[3]||t[7]===r[7])))throw Error('Trùng bài nghe kiểm tra');
 if(!d.assessments.every((r,i)=>+r[0]===i+1&&r[13]===dayId((i+1)*7-1)&&exam.some(e=>e[0]===r[13]&&e[3]===r[2])))throw Error('Sai đề kiểm tra');
 if(!Array.isArray(d.sources))throw Error('Thiếu ghi nguồn');return d;
}
export function safeUrl(x){try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
export function thresholds(week){return {total:week>=17?75:70,listen:[8,11,25,26].includes(week)?8:7,speak:week>=13?7:6};}
export function grade(week,values){if(!Number.isInteger(week)||week<1||week>26||!Array.isArray(values)||values.length!==5||values.some(v=>v===''||v===null||v===undefined))return {status:'Chưa đủ điểm',total:null};if(!values.every(v=>numeric(v,0,10)))return {status:'Điểm không hợp lệ',total:null};const total=Math.round(values.reduce((s,v,i)=>s+v*[3,3.5,1.5,1,1][i],0)*100)/100;const t=thresholds(week);return {status:total>=t.total&&values[0]>=t.listen&&values[1]>=t.speak?'Đạt':'Cần ôn lại',total};}
export function rateCard(old,rating,today=iso()){
 if(!Number.isInteger(rating)||rating<0||rating>3)throw Error('Invalid rating');
 let streak=old?.streak||0;let n;
 if(rating===0){streak=0;n=0;}else if(rating===1){streak=0;n=1;}else{streak=Math.min(5,streak+1);n=[1,3,7,14,30][Math.min(4,streak-1+(rating===3?1:0))];}
 return {level:rating,streak,due:addDays(today,n),last:today,reviews:(old?.reviews||0)+1};
}
export function cardItems(d){return [...d.vocabulary.map(r=>({id:r[0],day:+r[1],word:r[3],pos:r[4],meaning:r[5],ipa:r[6],collocation:r[7],example:r[8],translation:r[9],group:r[11],url:r[15],source:r[16],note:r[17],ipaSource:r[18],type:'word'})),...d.phrases.map(r=>({id:r[10],day:+r[0].slice(1),word:r[3],meaning:r[2],example:r[4],type:'phrase',group:'Cụm giao tiếp'}))];}
export function queue(items,state,day,today=iso(),mode='due',type='all'){
 let pool=items.filter(c=>type==='all'||c.type===type);
 if(mode==='weak')return pool.filter(c=>state.cards[c.id]&&state.cards[c.id].level<=1).sort((a,b)=>state.cards[a.id].due.localeCompare(state.cards[b.id].due));
 if(mode==='new')return pool.filter(c=>c.day<=day&&!state.cards[c.id]).sort((a,b)=>a.day-b.day);
 if(mode==='all')return pool;
 return pool.filter(c=>state.cards[c.id]&&state.cards[c.id].due<=today).sort((a,b)=>state.cards[a.id].level-state.cards[b.id].level||state.cards[a.id].due.localeCompare(state.cards[b.id].due));
}
export function requiredKeys(lesson){return +lesson[12]>0?['listen','speak','pronounce','language','write']:['rest'];}
export const coreDone=(lesson,s)=>requiredKeys(lesson).every(k=>s.days[lesson[0]]?.checks?.[k]===true);
export function nextDay(d,s){return +(d.lessons.find(r=>+r[12]>0&&!coreDone(r,s))?.[0].slice(1)||182);}
export function stats(d,s){const core=d.lessons.filter(r=>+r[12]>0);const mins=Object.values(s.days).reduce((a,v)=>a+(v.coreMin||0)+(v.vocabMin||0),0);return {complete:core.filter(r=>coreDone(r,s)).length,mins,words:d.vocabulary.filter(r=>s.cards[r[0]]?.level===3).length,assessed:d.vocabulary.filter(r=>s.cards[r[0]]).length,phrases:d.phrases.filter(r=>s.cards[r[10]]?.level===3).length,passed:d.assessments.filter(r=>grade(+r[0],s.scores[r[0]]?.values).status==='Đạt').length};}
export function validateBackup(x,d){
 if(!record(x)||x.version!==1||!record(x.days)||!record(x.cards)||!record(x.scores)||!record(x.settings)||!Array.isArray(x.errors)||!Number.isInteger(x.lastDay)||x.lastDay<1||x.lastDay>197)throw Error('File sao lưu sai định dạng');
 const out=fresh(),ids=new Set(cardItems(d).map(c=>c.id));out.lastDay=x.lastDay;out.settings={advanced:x.settings.advanced===true,dark:x.settings.dark===true};
 const str=v=>typeof v==='string'&&v.length<=20000;const checkDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00'));
 for(const [k,v] of Object.entries(x.days)){if(!/^D\d{3}$/.test(k)||+k.slice(1)<1||+k.slice(1)>197||!record(v)||!record(v.checks)||Object.entries(v.checks).some(([a,b])=>!['listen','speak','pronounce','language','write','rest','vocab'].includes(a)||typeof b!=='boolean')||!numeric(v.coreMin??0,0,1440)||!numeric(v.vocabMin??0,0,1440)||!str(v.notes??'')||!str(v.writing??'')||!str(v.feedback??''))throw Error('Dữ liệu ngày không hợp lệ');out.days[k]={checks:{...v.checks},coreMin:v.coreMin??0,vocabMin:v.vocabMin??0,notes:v.notes??'',writing:v.writing??'',feedback:v.feedback??''};}
 for(const [k,v] of Object.entries(x.cards)){if(!ids.has(k)||!record(v)||!Number.isInteger(v.level)||v.level<0||v.level>3||!Number.isInteger(v.streak)||v.streak<0||v.streak>5||!Number.isInteger(v.reviews)||v.reviews<1||!checkDate(v.due)||!checkDate(v.last))throw Error('Dữ liệu ôn không hợp lệ');out.cards[k]={level:v.level,streak:v.streak,reviews:v.reviews,due:v.due,last:v.last};}
 for(const [k,v] of Object.entries(x.scores)){if(!/^(?:[1-9]|1\d|2[0-6])$/.test(k)||!record(v)||!Array.isArray(v.values)||v.values.length!==5||v.values.some(n=>n!==null&&!numeric(n,0,10))||!str(v.notes??'')||!str(v.writing??''))throw Error('Điểm không hợp lệ');out.scores[k]={values:v.values.slice(),notes:v.notes??'',writing:v.writing??''};}
 if(x.errors.length>1000||x.errors.some(e=>!record(e)||!str(e.text)||!checkDate(e.date)))throw Error('Nhật ký không hợp lệ');out.errors=x.errors.map(e=>({text:e.text,date:e.date}));return out;
}
