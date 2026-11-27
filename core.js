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
 for(const [k,v] of Object.entries(x.days)){if(!/^D\d{3}$/.test(k)||+k.slice(1)<1||+k.slice(1)>197||!record(v)||!record(v.checks)||Object.entries(v.checks).some(([a,b])=>!['listen','speak','pronounce','language','write','rest','vocab'].includes(a)||typeof b!=='boolean')||!numeric(v.coreMin??0,0,1440)||!numeric(v.vocabMin??0,0,1440)||!str(v.notes??'')||!str(v.writing??'')||!str(v.feedback??''))throw Error('Dữ liệu ngày không hợp lệ');out.days[k]={checks:{...v.checks},coreMin:v.coreMin??0,vocabMin:v.vocabMin??0,notes:v.notes??'',writing:v.writing??'',feedback:v.feedback??''};if(v.guided!==undefined){
 const g=v.guided,plan=guidedPlan(d.lessons[+k.slice(1)-1]||d.lessons[181]),allowed=new Set(plan.steps.map(s=>s.id));
 if(!record(g)||!record(g.done)||!record(g.notes)||typeof g.cursor!=='string'||(g.cursor!==''&&g.cursor!=='summary'&&!allowed.has(g.cursor))||!['','easy','normal','hard'].includes(g.difficulty??'')||Object.entries(g.done).some(([a,b])=>!allowed.has(a)||typeof b!=='boolean')||Object.entries(g.notes).some(([a,b])=>!allowed.has(a)||!str(b)))throw Error('Dữ liệu hướng dẫn không hợp lệ');
 out.days[k].guided={cursor:g.cursor,done:{...g.done},notes:{...g.notes},difficulty:g.difficulty??''};
 }} 
 for(const [k,v] of Object.entries(x.cards)){if(!ids.has(k)||!record(v)||!Number.isInteger(v.level)||v.level<0||v.level>3||!Number.isInteger(v.streak)||v.streak<0||v.streak>5||!Number.isInteger(v.reviews)||v.reviews<1||!checkDate(v.due)||!checkDate(v.last))throw Error('Dữ liệu ôn không hợp lệ');out.cards[k]={level:v.level,streak:v.streak,reviews:v.reviews,due:v.due,last:v.last};}
 for(const [k,v] of Object.entries(x.scores)){if(!/^(?:[1-9]|1\d|2[0-6])$/.test(k)||!record(v)||!Array.isArray(v.values)||v.values.length!==5||v.values.some(n=>n!==null&&!numeric(n,0,10))||!str(v.notes??'')||!str(v.writing??''))throw Error('Điểm không hợp lệ');out.scores[k]={values:v.values.slice(),notes:v.notes??'',writing:v.writing??''};}
 if(x.errors.length>1000||x.errors.some(e=>!record(e)||!str(e.text)||!checkDate(e.date)))throw Error('Nhật ký không hợp lệ');out.errors=x.errors.map(e=>({text:e.text,date:e.date}));return out;
}

/** Guided lesson plan derived from the original timed instructions; no new resource IDs. */
export const guidedSkills=[
 ['listen','Luyện nghe',6],['speak','Luyện nói',7],['pronounce','Phát âm',8],
 ['language','Cụm từ & ngữ pháp',9],['write','Luyện viết',10]
];
const outcomes={
 listen:'Ghi lại kết quả nghe hoặc chi tiết nghe được; kiểm tra theo yêu cầu của bước.',
 speak:'Thực hiện nhiệm vụ bằng tiếng Anh; ghi kết quả hoặc lỗi cần sửa.',
 pronounce:'Luyện đúng âm/câu mục tiêu và tự kiểm tra bằng bản ghi hoặc mẫu.',
 language:'Gợi nhớ trước khi xem đáp án; vận dụng cụm/cấu trúc trong câu của mình.',
 write:'Lưu bài viết hoặc phần chỉnh sửa theo yêu cầu.',
 vocab:'Đánh giá bằng khả năng thực tế; ưu tiên từ yếu.',
 rest:'Có thể nghỉ hoặc ghi một lỗi cần ôn.'
};
const captions={
 listen:['Dự đoán / nghe lấy ý chính','Nghe và lấy chi tiết','Đối chiếu và sửa lỗi','Nghe lại / chép đoạn khó','Tóm tắt'],
 speak:['Học mẫu / chuẩn bị','Thực hành hội thoại','Nhận phản hồi','Nói lại'],
 pronounce:['Nghe và nhận diện','Luyện nói theo mẫu','Ghi âm và sửa'],
 language:['Gợi nhớ cụm từ','Vận dụng mẫu câu'],
 write:['Đọc mẫu / lập dàn ý','Tự viết','Rà soát']
};
export function guidedPlan(l){
 const n=+l[0].slice(1), rest=+l[12]===0, exam=+l[2]===6;
 const groups=[];
 const make=(key,label,mins,detail,i,title)=>({id:key+'-'+(i+1),key,label,title,minutes:mins,detail,output:outcomes[key]});
 if(rest){
  groups.push({key:'rest',label:n===182?'Tổng kết / nghỉ tùy chọn':'Nghỉ hoặc ôn nhẹ',steps:[make('rest','Ngày nghỉ',0,[l[6],l[7],l[8],l[9].split('\nNgoài giờ chính:')[0],l[10]].filter(t=>t&&t!=='—').join('\n'),0,n===182?'Đánh giá lại nếu đủ thời gian':'Chọn nghỉ hoặc ôn nhẹ')]});
 }else for(const [key,label,col] of guidedSkills){
  const raw=l[col].split('\nNgoài giờ chính:')[0].trim(),first=raw.match(/^(\d+)\s*[′’']/);
  if(!first)throw Error(l[0]+' thiếu thời lượng '+key);
  const total=+first[1],body=raw.slice(first[0].length).replace(/^\s*:\s*/,'').trim(),matches=[...body.matchAll(/(\d+)\s*[′’']/g)];
  let sum=0,selected=[];
  if(n!==1&&!exam){
   for(const m of matches){if(sum+Number(m[1])>total)break;selected.push(m);sum+=Number(m[1]);if(sum===total)break;}
  }
  let steps=[];
  if(sum===total&&selected.length>1){
   const prefix=body.slice(0,selected[0].index).trim();
   selected.forEach((m,i)=>{
    let detail=body.slice(m.index+m[0].length,selected[i+1]?.index??body.length).trim().replace(/^[;:]\s*/,'');
    if(i===0&&prefix)detail=prefix+' '+detail;
    // Do not give a misleading label for varying listening sequences; use exact action text.
    const action=detail.toLowerCase();
    const title=key==='listen'?(action.includes('đoán nội dung')?'Dự đoán nội dung':/chép đoạn/.test(action)?'Chép đoạn nghe khó':/transcript/.test(action)?'Đối chiếu transcript':/quiz|5 chi tiết/.test(action)?'Làm quiz / ghi chi tiết':/sửa 3 đoạn/.test(action)?'Sửa 3 đoạn khó':/tốc độ gốc/.test(action)?'Nghe lại tốc độ gốc':/kể lại|tóm tắt/.test(action)?'Kể lại / tóm tắt':/không chữ|nghe 2 lượt/.test(action)?'Nghe không nhìn chữ':'Nghe lấy ý chính'):(captions[key]?.[i]||label);
    steps.push(make(key,label,+m[1],detail,i,title));
   });
  }else steps=[make(key,label,total,body,0,n===1?'Đánh giá đầu vào · '+label:exam?'Kiểm tra độc lập · '+label:label)];
  groups.push({key,label,steps});
 }
 if(!rest){
  const v=[['Sàng lọc từ mới',2,'Kiểm tra từ được phân bổ hôm nay; bỏ qua từ đã dùng thành thạo.'],['Học từ yếu',5,'Học sâu tối đa 3–5 từ: nghĩa, cụm đi kèm và ví dụ.'],['Nghe và phát âm',3,'Nghe phát âm từ mục tiêu rồi nhắc lại.'],['Ôn đến hạn',7,'Ưu tiên thẻ chưa nhớ; không bắt buộc xử lý hết hàng đợi trong 7 phút.'],['Vận dụng',3,'Tự đặt câu bằng từ vừa học, không nhìn đáp án.']];
  groups.push({key:'vocab',label:'Từ vựng bổ sung',steps:v.map(([t,m,d],i)=>make('vocab','Từ vựng bổ sung',m,d,i,t))});
 }
 return {kind:rest?'rest':n===1?'baseline':exam?'assessment':'practice',groups,steps:groups.flatMap(g=>g.steps)};
}
export function guideDay(d){
 return d.guided??={cursor:'',done:{},notes:{},difficulty:''};
}
export function stepDone(d,s){return d.checks[s.key]===true||d.guided?.done?.[s.id]===true;}
export function markGuided(d,plan,id,checked=true){
 const step=plan.steps.find(s=>s.id===id);if(!step)return;
 const g=guideDay(d),group=plan.groups.find(x=>x.key===step.key);
 // Expand legacy completed skills before editing one step.
 if(d.checks[step.key]===true)for(const s of group.steps)g.done[s.id]=true;
 g.done[id]=checked;d.checks[step.key]=group.steps.every(s=>g.done[s.id]===true);
}
export function syncGuideCheck(d,plan,key,checked){
 const group=plan.groups.find(g=>g.key===key);if(!group){d.checks[key]=checked;return;}
 const g=guideDay(d);for(const s of group.steps)g.done[s.id]=checked;
 d.checks[key]=checked;
}
