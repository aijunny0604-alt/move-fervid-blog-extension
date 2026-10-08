'use strict';
const $=id=>document.getElementById(id);

let chosen=[],selected=new URLSearchParams(location.search).get('preview'),busy=false,uploading=false,urls=[];let restoreReading=!!selected;
let connectionPromise=null;
async function connection(){
 if(!connectionPromise)connectionPromise=chrome.runtime.sendMessage({type:'studio-connect'}).then(r=>{if(!r?.ok)throw Error(r?.error||'연결 실패');return r.data;}).catch(e=>{connectionPromise=null;throw e;});
 return connectionPromise;
}
async function engineFetch(path,options={}){
 const c=await connection();
 try{return await fetch(c.url+path,{...options,headers:{...options.headers,Authorization:'Bearer '+c.token}});}
 catch{connectionPromise=null;throw Error('로컬 엔진 연결이 끊겼습니다. Chrome을 열어 둔 상태로 다시 연결해 주세요.');}
}
async function api(path,body){
 const r=await engineFetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const d=await r.json();if(!r.ok)throw Error(d.error||'연결 실패');return d;
}
function decode(b){if(b[0]===255&&b[1]===254)return new TextDecoder('utf-16le').decode(b);if(b[0]===254&&b[1]===255)return new TextDecoder('utf-16be').decode(b);try{return new TextDecoder('utf-8',{fatal:true}).decode(b);}catch{return new TextDecoder('euc-kr').decode(b);}}
async function pick(e){
 chosen=[...e.target.files];const photos=chosen.filter(f=>/\.(jpg|jpeg|png|webp)$/i.test(f.name)),notes=chosen.filter(f=>/\.(txt|md)$/i.test(f.name));
 $('selection').textContent=photos.length+'장 · 참고 메모 '+notes.length+'개 · '+(chosen.reduce((n,f)=>n+f.size,0)/1048576).toFixed(1)+'MB';
 $('notes').textContent='';for(const f of notes){if(f.size>524288){$('notes').textContent+='큰 메모 파일: '+f.name+'\n';continue;}$('notes').textContent+=f.name+'\n'+decode(new Uint8Array(await f.arrayBuffer()))+'\n\n';}
 $('create').disabled=!photos.length||busy;
}
$('folder').onchange=pick;$('files').onchange=pick;
function b64(file){return new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(',')[1]);r.onerror=no;r.readAsDataURL(file);});}
$('create').onclick=async()=>{
 if(busy||uploading)return;uploading=true;busy=true;$('create').disabled=true;$('progress').hidden=false;$('error').textContent='';$('stage').textContent='사진과 메모 준비 중';$('bar').value=2;
 try{
  await api('/api/status');
  const filtered=chosen.filter(f=>/\.(jpg|jpeg|png|webp|txt|md)$/i.test(f.name));
  if(filtered.reduce((n,f)=>n+f.size,0)>200*1048576)throw Error('선택 자료는 총 200MB까지입니다.');
  const files=[];for(const f of filtered)files.push({path:f.webkitRelativePath||f.name,data:await b64(f)});
  const job=await api('/api/jobs',{brand:document.querySelector('[name=brand]:checked').value,details:$('details').value,files});selected=job.id;await refresh();
 }catch(e){$('error').textContent=e.message;busy=false;$('create').disabled=false;}finally{uploading=false;}
};
async function refresh(){
 try{
  const state=await api('/api/status');busy=!!state.active||uploading;$('create').disabled=busy||!chosen.some(f=>/\.(jpg|jpeg|png|webp)$/i.test(f.name));
  if(!selected&&state.active)selected=state.active;
  const job=state.jobs.find(j=>j.id===selected);
  if(job){$('progress').hidden=false;$('stage').textContent=job.stage;$('bar').value=job.progress||0;$('error').textContent=job.error||job.warning||'';if(job.stage==='완료'){show(job);if(restoreReading){restoreReading=false;$('preview').click();}}}
  $('history').replaceChildren();for(const j of state.jobs){const b=document.createElement('button');b.textContent=(j.title||j.id)+' · '+j.stage;b.onclick=()=>{selected=j.id;$('result').hidden=true;refresh();};$('history').append(b);}
 }catch(e){$('connection').textContent=e.message;}
}
function show(j){$('result').hidden=false;$('resultTitle').textContent=j.title;$('warnings').textContent='썸네일 제작 완료 · 글 미리보기의 첫 이미지에서 확인하세요.\n'+(j.warnings||[]).map(w=>w.startsWith('차량 전면 3/4 사진이 없습니다.')?'전면 3/4 구도의 원본이 없어 실제 후면 사진으로 썸네일을 제작했습니다.':w).join('\n');}
async function asset(name){const r=await engineFetch('/api/jobs/'+selected+'/asset/'+encodeURIComponent(name).replaceAll('%2F','/'));if(!r.ok)throw Error('결과 파일을 읽지 못했습니다.');return r;}

function leaveReading(){const page=$('readingPage');if(page)page.remove();document.querySelector('main').hidden=false;}
window.addEventListener('popstate',leaveReading);
$('preview').onclick=async()=>{
 const job=selected;
 const main=document.querySelector('main');main.hidden=true;
 const page=document.createElement('main');page.id='readingPage';
 const bar=document.createElement('nav');bar.className='reading-bar';
 const back=document.createElement('button');back.textContent='← 작업 화면으로';back.onclick=()=>{if(history.state?.preview)history.back();else{leaveReading();history.replaceState(null,'',location.pathname);}};bar.append(back);
 const content=document.createElement('article');page.append(bar,content);document.body.append(page);
 if(new URLSearchParams(location.search).get('preview')!==job)history.pushState({preview:job},'','?preview='+job);window.scrollTo(0,0);
 content.textContent='사진을 불러오는 중입니다…';
 const get=async name=>{const r=await engineFetch('/api/jobs/'+job+'/asset/'+encodeURIComponent(name).replaceAll('%2F','/'));if(!r.ok)throw Error('결과 파일을 읽지 못했습니다: '+name);return r;};
 $('preview').disabled=true;
 try{
 const article=await(await get('블로그_최종_데이터.json')).json();
 let markup=await(await get('미리보기.html')).text();
 const names=[...new Set([article.thumbnail,...article.photos.map(p=>p.file)])];
 const replacements=new Map();let cursor=0,done=0;
 async function worker(){while(cursor<names.length){const name=names[cursor++];const blob=await(await get(name)).blob();const encoded='data:'+blob.type+';base64,'+await b64(blob);replacements.set(name,encoded);done++;content.textContent='사진 '+done+' / '+names.length+'장 불러오는 중…';}}
 await Promise.all(Array.from({length:3},worker));
 for(const [name,url] of replacements)markup=markup.replaceAll('src="'+name+'"','src="'+url+'"');
 if(!page.isConnected)return;
 const parsed=new DOMParser().parseFromString(markup,'text/html');
 content.replaceChildren(...Array.from(parsed.body.childNodes).map(n=>document.importNode(n,true)));
 const imgs=Array.from(content.querySelectorAll('img'));
 imgs.forEach((img,i)=>{img.alt=i===0?'실제 작업 사진으로 제작한 썸네일':'작업 사진 '+i;img.decoding='async';});
 await Promise.all(imgs.map(img=>img.decode().catch(()=>null)));
 const missing=imgs.filter(img=>!img.naturalWidth).length;
 const state=document.createElement('span');state.textContent=missing?'사진 '+missing+'장을 표시하지 못했습니다.':'썸네일 포함 '+imgs.length+'장 · 사진 표시 완료';bar.append(state);
 }catch(e){content.textContent=e.message;}finally{$('preview').disabled=false;}
};
$('analysis').onclick=async()=>{try{$('analysisText').textContent=await(await asset('검색량_분석.md')).text();$('analysisText').hidden=false;$('previewFrame').hidden=true;$('viewer').showModal();}catch(e){$('error').textContent=e.message;}};
$('closeViewer').onclick=()=>$('viewer').close();
$('send').onclick=async()=>{try{
 const raw=$('schedule').value;if(raw&&new Date(raw)<=new Date())throw Error('미래의 예약 시간을 선택해 주세요.');
 const d=await api('/api/select',{id:selected,schedule:raw?raw+':00+09:00':''});
 const result=await chrome.runtime.sendMessage({type:'studio-open-naver'});
 if(!result?.ok)throw Error(result?.error||'네이버 열기 실패');
 $('handoff').textContent='네이버 새 글을 열었습니다. 입력 도우미에서 기존 템플릿 상태를 확인한 뒤 원고 자동 입력을 누르세요.';
}catch(e){$('handoff').textContent=e.message;}};
api('/api/health').then(d=>{$('connection').textContent=d.message;}).catch(e=>$('connection').textContent=e.message);
refresh();setInterval(refresh,4000);

$('reconnect').onclick=()=>{connectionPromise=null;api('/api/health').then(d=>$('connection').textContent=d.message).catch(e=>$('connection').textContent=e.message);};
