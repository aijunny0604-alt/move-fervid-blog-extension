let nativePort=null,connecting=null;
const pendingTabs=new Map();
function connectStudio(){
 if(connecting)return connecting;
 connecting=new Promise((resolve,reject)=>{
  let finished=false;
  const timeout=setTimeout(()=>{if(!finished){finished=true;connecting=null;try{nativePort?.disconnect();}catch{}reject(Error('연결 시간이 초과됐습니다. 확장 연결 설정을 확인하세요.'));}},20000);
  try{
   nativePort=chrome.runtime.connectNative('com.moveam.blogstudio');
   nativePort.onMessage.addListener(message=>{
    if(finished)return;finished=true;clearTimeout(timeout);
    if(!message.ok){connecting=null;reject(Error(message.error||'연결 실패'));return;}
    if(message.url!=='http://127.0.0.1:18764'||typeof message.token!=='string'){connecting=null;reject(Error('연결 응답 형식 오류'));return;}
    resolve({url:message.url,token:message.token});
   });
   nativePort.onDisconnect.addListener(()=>{
    const error=chrome.runtime.lastError;connecting=null;nativePort=null;
    if(!finished){finished=true;clearTimeout(timeout);reject(Error('최초 연결 설정이 필요합니다. 함께 제공한 「확장 연결 설치.cmd」를 한 번 실행하세요.'+(error?' ('+error.message+')':'')));}
   });
   nativePort.postMessage({action:'connect'});
  }catch(e){clearTimeout(timeout);connecting=null;reject(e);}
 });
 return connecting;
}
async function bridge(path){const c=await connectStudio();const r=await fetch(c.url+path,{headers:{Authorization:'Bearer '+c.token}});if(!r.ok){let e;try{e=await r.json();}catch{}throw Error(e?.error||'연결 실패');}return r;}
async function inject(tabId){
 for(let attempt=0;attempt<15;attempt++){
  if(!pendingTabs.has(tabId))return;
  try{
   const rows=await chrome.scripting.executeScript({target:{tabId,allFrames:true},files:['core.js','adapter.js','panel.js']});
   if(rows.some(r=>r.result==='editor')){pendingTabs.delete(tabId);return;}
  }catch{}
  await new Promise(r=>setTimeout(r,600));
 }
 pendingTabs.delete(tabId);
}
chrome.tabs.onUpdated.addListener((id,info)=>{if(info.status==='complete'&&pendingTabs.get(id)==='waiting'){pendingTabs.set(id,'injecting');inject(id);}});
chrome.tabs.onRemoved.addListener(id=>pendingTabs.delete(id));
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
 if(sender.id!==chrome.runtime.id)return;
 const own=typeof sender.url==='string'&&sender.url.startsWith(chrome.runtime.getURL(''));
 const naver=/^https:\/\/blog\.naver\.com\//.test(sender.url||'');
 if(!own&&!naver)return;
 (async()=>{
  if(msg.type==='studio-connect'&&own)return await connectStudio();
  if(msg.type==='studio-open'&&naver){await chrome.tabs.create({url:chrome.runtime.getURL('studio.html')});return {};}
  if(msg.type==='studio-open-naver'&&own){
   const result=await(await bridge('/api/selected-meta')).json();
   const id=result.article.blog_id;if(!/^[a-zA-Z0-9_-]{2,50}$/.test(id))throw Error('블로그 계정 오류');
   const tab=await chrome.tabs.create({url:'https://blog.naver.com/'+encodeURIComponent(id)+'?Redirect=Write'});
   pendingTabs.set(tab.id,'waiting');
   const current=await chrome.tabs.get(tab.id);
   if(current.status==='complete'){pendingTabs.set(tab.id,'injecting');inject(tab.id);}
   return {tabId:tab.id};
  }
  if(msg.type==='studio-meta')return await(await bridge('/api/selected-meta')).json();
  if(msg.type==='studio-asset'){
   if(!/^[a-f0-9]{12}$/.test(msg.job)||!/^(thumbnail\.png|_upload\/\d{3}\.jpg)$/.test(msg.path))throw Error('사진 경로 오류');
   const r=await bridge('/api/jobs/'+msg.job+'/asset/'+msg.path);
   const bytes=new Uint8Array(await r.arrayBuffer());let raw='';
   for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {path:msg.path,mime:r.headers.get('Content-Type'),base64:btoa(raw)};
  }
  throw Error('지원하지 않는 요청');
 })().then(data=>reply({ok:true,data}),e=>reply({ok:false,error:e.message}));
 return true;
});
chrome.action.onClicked.addListener(async tab=>{
 // 항상 확장 자체 화면에서 사진 선택·생성·미리보기를 시작한다.
 const studioUrl=chrome.runtime.getURL('studio.html');
 const tabs=await chrome.tabs.query({url:studioUrl+'*'});
 if(tabs.length){await chrome.tabs.update(tabs[0].id,{active:true});return;}
 await chrome.tabs.create({url:studioUrl});
});
