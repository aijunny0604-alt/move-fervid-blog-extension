(() => {
'use strict';
if(!globalThis.MoveBlogAdapter?.ready())return 'other';
const prev=document.getElementById('move-blog-helper-root');if(prev){prev.hidden=!prev.hidden;return 'editor';}
const host=document.createElement('div');host.id='move-blog-helper-root';document.documentElement.append(host);
const s=host.attachShadow({mode:'open'});
s.innerHTML=`<style>
:host{all:initial;position:fixed;right:14px;top:145px;width:330px;max-height:calc(100vh - 165px);z-index:2147483646;font:13px/1.6 'Malgun Gothic',sans-serif;color:#17231e}*{box-sizing:border-box}.panel{background:white;border:1px solid #d8e4dc;border-radius:16px;box-shadow:0 12px 45px #0002;overflow:auto;max-height:calc(100vh - 165px);padding:20px}header{display:flex;justify-content:space-between}h1{font-size:18px;margin:0}small{color:#68766c}button,.pick{font:inherit;border:1px solid #d8e4dc;border-radius:9px;background:#f5f8f6;padding:10px 12px;cursor:pointer}button:hover{background:#e9f4ed}button:disabled{opacity:.45;cursor:default}.primary{background:#187347;color:white}.wide{display:block;width:100%;margin:8px 0;text-align:center}.row{display:flex;gap:8px;margin:8px 0}.row button{flex:1}.pick input{position:absolute;opacity:0;width:1px;height:1px}img{width:100px;height:100px;object-fit:contain;float:right;margin:5px}.summary{padding:12px;background:#f4f8f5;border-radius:10px;margin-top:12px}.check{display:flex;gap:6px;margin:12px 0}progress{width:100%;accent-color:#187347}#status{white-space:pre-wrap;overflow-wrap:anywhere;max-height:170px;overflow:auto;padding:12px;background:#f5f7f6;border-radius:9px}.error{color:#a73131}details{font-size:12px;color:#526459;border-top:1px solid #e3e9e5;margin-top:15px;padding-top:12px}summary{cursor:pointer}.notice{font-size:12px;color:#75633c;background:#fff9e9;padding:9px;border-radius:8px}
</style><section class="panel"><header><div><h1>무브 · 퍼비드</h1><small>블로그 도우미 1.1</small></div><button id="close" aria-label="접기">×</button></header>
<p>만들어둔 글과 실제 사진을 바로 불러옵니다.</p><button id="openStudio" class="wide">사진으로 새 글 만들기</button><button id="loadStudio" class="primary wide">① 완성 글 불러오기</button>
<label class="pick wide">파일로 가져오기 (선택)<input id="folder" type="file" accept=".moveblog"></label>
<div id="summary" hidden class="summary"><img id="thumbnail" alt="대표 썸네일"><b id="title"></b><p id="meta"></p><p id="schedule"></p><div style="clear:both"></div></div>
<label class="check"><input id="footer" type="checkbox">내 템플릿의 샘플 본문을 지우고 하단 지도·문의 배너만 남겼습니다.</label>
<button id="start" class="primary wide" disabled>② 원고 자동 입력</button>
<div class="row"><button id="next" disabled>한 항목씩 입력</button><button id="stop" disabled>일시 정지</button></div>
<progress id="progress" max="1" value="0"></progress><small id="counter">완성 글을 불러와 주세요.</small>
<p id="status" role="status" aria-live="polite">네이버 새 글에서 시작하세요. 기존 글은 덮어쓰지 않습니다.</p>
<button id="review" class="wide" disabled>③ 본문 · 예약 설정 확인</button>
<p class="notice">입력 완료 후 제목 배경 사진과 예약 시간을 확인하고 네이버의 ‘발행’을 눌러 주세요.</p>
<details><summary>처음 사용하는 방법</summary><p>1. 새 글에 내 템플릿을 적용하고 샘플 제목·본문·사진을 삭제해 하단 문의 양식만 남기세요. 빈 글로 시작해도 됩니다.</p><p>2. 전달받은 .moveblog 파일 하나를 엽니다. 원고와 사진이 모두 들어 있어 폴더 선택이나 압축 해제가 필요 없습니다.</p><p>3. 입력 도중 편집기를 직접 수정하지 마세요. 원고와 다르면 자동으로 멈춥니다. 새로고침하면 진행 정보가 사라집니다.</p><p>4. 제목 배경은 title_background 파일을 직접 선택합니다. 대표사진·예약 시간을 확인한 후 네이버에서 최종 발행합니다.</p><p>이미 예약된 X6 글을 테스트하려고 다시 발행하지 마세요.</p><p>블로그 스튜디오에서 사진·메모로 원고와 썸네일을 만든 뒤 가져옵니다. 이 패널은 네이버 입력을 담당합니다.</p></details>
<button id="log" class="wide">점검 기록 저장</button></section>`;
const $=id=>s.getElementById(id);
let data,files,steps,writer,running=false,thumbURL;const logs=[];
function status(message,error=false){$('status').textContent=message;$('status').className=error?'error':'';logs.push({at:new Date().toISOString(),message});}
function update(){const done=writer?.cursor||0;$('progress').max=steps?.length||1;$('progress').value=done;$('counter').textContent=steps?done+' / '+steps.length+' 항목 · 사진 '+data.photos.length+'장':'완성 글을 불러와 주세요.';$('start').disabled=!data||running||done===steps?.length;$('next').disabled=!data||running||done===steps?.length;$('stop').disabled=!running;$('folder').disabled=running||!!writer;$('footer').disabled=!!writer;$('start').textContent=writer?'계속 자동 입력':'② 원고 자동 입력';$('review').disabled=!writer||running||done!==steps.length;}
$('close').onclick=()=>host.hidden=true;
$('openStudio').onclick=()=>chrome.runtime.sendMessage({type:'studio-open'});
$('folder').onchange=async event=>{
try{
data=null;writer=null;steps=null;files=null;update();$('summary').hidden=true;
const source=event.target.files[0];if(!source)throw Error('작업 파일을 선택해 주세요.');
if(source.size>280*1024*1024)throw Error('작업 파일이 너무 큽니다.');
status('작업 파일에서 원고와 사진을 불러오는 중입니다…');
const unpacked=MoveBlogCore.unpack(JSON.parse(await source.text()));loadDraft(unpacked.data,unpacked.files);
}catch(e){status(e.message,true);}finally{update();}
};
function loadDraft(draft,map){
if(new URL(location.href).searchParams.get('blogId')!==draft.blog_id)throw Error('현재 계정과 원고가 다릅니다. 대상: '+draft.blog_id);
for(const name of MoveBlogCore.filesNeeded(draft)){const f=map.get(name);if(!f)throw Error('사진 파일 없음: '+name);if(!f.size||f.size>30*1024*1024)throw Error('사진 크기를 확인하세요: '+name);}
if(thumbURL)URL.revokeObjectURL(thumbURL);thumbURL=URL.createObjectURL(map.get(draft.thumbnail));$('thumbnail').src=thumbURL;
data=draft;files=map;steps=MoveBlogCore.plan(data);$('title').textContent=data.title;$('meta').textContent=data.blog_id+' · 작업 사진 '+data.photos.length+'장 · 설명 '+data.photos.reduce((n,p)=>n+p.paragraphs.length,0)+'문단';$('schedule').textContent=data.scheduled_at?'예약: '+data.scheduled_at.replace('T',' ').replace(':00+09:00',' (한국시간)'):'예약 미지정';$('summary').hidden=false;
status('원고와 사진 확인 완료. 사진을 다시 생성하거나 늘리지 않고 원본 파일을 사용합니다.');
update();
}
async function bridge(message){const r=await chrome.runtime.sendMessage(message);if(!r?.ok)throw Error(r?.error||'연결 실패. 블로그 시작 파일을 실행하세요.');return r.data;}
$('loadStudio').onclick=async()=>{
 if(running||writer)return; $('loadStudio').disabled=true;data=null;steps=null;files=null;update();$('summary').hidden=true;
 try{status('완성 글과 사진을 불러오는 중입니다…');const result=await bridge({type:'studio-meta'});const draft=MoveBlogCore.validate(result.article);
 if(new URL(location.href).searchParams.get('blogId')!==draft.blog_id)throw Error('이 글의 대상 계정은 '+draft.blog_id+'입니다. 해당 계정의 새 글을 열어 주세요.');
 const assets=[];for(const path of MoveBlogCore.filesNeeded(draft)){status('사진 불러오는 중 '+(assets.length+1)+' / '+MoveBlogCore.filesNeeded(draft).length);assets.push(await bridge({type:'studio-asset',job:result.id,path}));}
 const unpacked=MoveBlogCore.unpack({format:'move-blog-pack',version:1,article:draft,assets});loadDraft(unpacked.data,unpacked.files);
 }catch(e){status(e.message,true);}finally{$('loadStudio').disabled=false;}
};
function begin(){if(!writer){const candidate=new MoveBlogAdapter.Writer(data,steps,files);candidate.start($('footer').checked);writer=candidate;}}
async function run(single){if(running)return;running=true;try{begin();writer.stopped=false;update();do{if(writer.stopped)break;const step=steps[writer.cursor];if(!step)break;status('입력 중 '+(writer.cursor+1)+'/'+steps.length+': '+(step.type==='image'?step.file:step.type==='title'?'제목':'사진 설명'));await writer.next();update();if(single)break;}while(writer.cursor<steps.length);status(writer.cursor===steps.length?'본문 입력 완료. 원문과 사진 순서를 확인했습니다. 제목 배경·대표사진·하단 문의 양식을 확인하고 예약 설정을 진행하세요.':'일시 정지했습니다. 계속 입력할 수 있습니다.');}catch(e){status('중지: '+e.message+'\n부분 입력이 보이면 다시 시작하지 말고 원고와 대조하세요.',true);}finally{running=false;update();}}
$('start').onclick=()=>run(false);$('next').onclick=()=>run(true);$('stop').onclick=()=>{if(writer)writer.stopped=true;status('현재 항목이 완료되면 정지합니다.');};
$('review').onclick=()=>{
try{writer.check();const selects=[...document.querySelectorAll('select')];const hour=selects.find(e=>e.getAttribute('aria-label')==='예약 발행 시간 선택');const minute=selects.find(e=>e.getAttribute('aria-label')==='예약 발행 분 선택');
if(!hour||!minute){const buttons=[...document.querySelectorAll('button')].filter(b=>b.textContent.trim()==='발행'&&b.getClientRects().length);if(buttons.length===1)buttons[0].click();status('본문 대조 통과. 날짜와 시간을 선택한 뒤 이 버튼을 다시 누르면 확인합니다.\n제목 배경 파일: '+(data.title_background||'미지정')+'\n예정: '+(data.scheduled_at||'미지정'));return;}
if(!data.scheduled_at)throw Error('원고에 예약 시간이 없습니다. 네이버에서 직접 확인해 주세요.');
if(Date.parse(data.scheduled_at)<=Date.now())throw Error('예정 시간이 지났습니다. 새 예약 시간을 정해 주세요.');
const date=data.scheduled_at.slice(0,10).replaceAll('-','');const dateOK=[...document.querySelectorAll('input')].some(e=>e.value.replace(/\D/g,'')===date);
if(!document.getElementById('radio_time2')?.checked||!dateOK||hour.value!==data.scheduled_at.slice(11,13)||minute.value!==data.scheduled_at.slice(14,16))throw Error('예약 설정이 원고의 예정 시간과 다릅니다. '+data.scheduled_at);
status('본문·사진 순서·기존 템플릿·예약 시간 대조 통과. 대표사진과 제목 배경을 확인하고 네이버 발행 버튼을 누르세요.');
}catch(e){status(e.message,true);}
};
$('log').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:'1.0.0',blog:data?.blog_id,cursor:writer?.cursor,total:steps?.length,logs},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='블로그_도우미_점검기록.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
$('loadStudio').click();
return 'editor';
})();
