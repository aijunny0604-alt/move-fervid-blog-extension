'use strict';
const privacyButton=document.createElement('button');
privacyButton.textContent='번호판 모자이크 확인·수정';
privacyButton.className='secondary';
$('preview').parentElement.append(privacyButton);
privacyButton.onclick=async()=>{
 const job=selected;
 const main=document.querySelector('main');
 const page=document.createElement('main');page.id='privacyPage';
 const heading=document.createElement('h1');heading.textContent='노출된 부분만 가리기';
 const help=document.createElement('p');help.textContent='번호판 네 모서리를 테두리 순서대로 클릭하세요. 기울어진 번호판도 윤곽 안쪽만 처리됩니다. 자동 감지가 놓친 번호판과 배경 차량도 확인해 주세요. 원본은 보존되며 저장하면 본문·썸네일에 함께 반영됩니다.';
 const select=document.createElement('select');select.setAttribute('aria-label','모자이크할 사진');
 const canvas=document.createElement('canvas');canvas.style.cssText='width:100%;height:auto;touch-action:none;cursor:crosshair';canvas.setAttribute('aria-label','번호판 네 모서리 순서대로 선택');
 const row=document.createElement('div');row.className='pickers';
 const undo=document.createElement('button');undo.textContent='마지막 영역 취소';
 const clear=document.createElement('button');clear.textContent='이 사진 영역 지우기';
 const save=document.createElement('button');save.textContent='저장하고 적용';
 const back=document.createElement('button');back.textContent='작업 화면으로';
 const info=document.createElement('p');info.setAttribute('role','status');
 row.append(undo,clear,save,back);page.append(heading,help,select,canvas,row,info);
 main.hidden=true;document.body.append(page);window.scrollTo(0,0);
 let data,current,image,pending=[],dirty=false,loading=false;
 const ctx=canvas.getContext('2d');
 function draw(){if(!image)return;ctx.drawImage(image,0,0);ctx.strokeStyle='#e12929';ctx.lineWidth=Math.max(2,canvas.width/350);ctx.fillStyle='rgba(220,20,20,.25)';for(const b of data.masks[current]){const v=b.length===4?[b[0],b[1],b[2],b[1],b[2],b[3],b[0],b[3]]:b;ctx.beginPath();for(let i=0;i<8;i+=2){const x=v[i]*canvas.width,y=v[i+1]*canvas.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();}for(const p of pending){ctx.beginPath();ctx.arc(p[0]*canvas.width,p[1]*canvas.height,6,0,Math.PI*2);ctx.fill();}info.textContent='사진 '+current+' · 영역 '+data.masks[current].length+'개 · 모서리 '+pending.length+'/4'+(dirty?' · 저장 전':'');}

 async function load(){loading=true;save.disabled=true;current=select.value;pending=[];image=null;info.textContent='사진 불러오는 중…';try{const r=await engineFetch('/api/jobs/'+job+'/asset/vision/'+current+'.jpg');if(!r.ok)throw Error('사진을 읽을 수 없습니다.');const url=URL.createObjectURL(await r.blob());try{const im=new Image();im.src=url;await im.decode();image=im;canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;draw();}finally{URL.revokeObjectURL(url);}}catch(e){info.textContent=e.message;}finally{loading=false;save.disabled=false;}}
 const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
 canvas.onpointerdown=e=>{if(loading||!image)return;pending.push(point(e));if(pending.length===4){const q=pending;const c=q.map((a,i)=>{const b=q[(i+1)%4],d=q[(i+2)%4];return (b[0]-a[0])*(d[1]-b[1])-(b[1]-a[1])*(d[0]-b[0]);});if(!c.every(x=>x>1e-10)&&!c.every(x=>x< -1e-10)){pending=[];draw();info.textContent='교차하지 않도록 네 모서리를 테두리 순서로 선택해 주세요.';return;}data.masks[current].push(pending.flat());pending=[];dirty=true;}draw();};
 undo.onclick=()=>{if(!image)return;if(pending.length)pending.pop();else{data.masks[current].pop();dirty=true;}draw();};clear.onclick=()=>{if(!image)return;pending=[];data.masks[current]=[];dirty=true;draw();};
 select.onchange=load;
 back.onclick=()=>{if(dirty&&!confirm('저장하지 않은 영역 수정을 버리고 돌아갈까요?'))return;page.remove();main.hidden=false;};
 save.onclick=async()=>{if(pending.length){info.textContent='네 모서리 선택을 끝내거나 마지막 영역 취소를 누르세요.';return;}save.disabled=true;select.disabled=true;undo.disabled=true;clear.disabled=true;canvas.style.pointerEvents='none';info.textContent='본문 사진과 썸네일에 반영 중…';try{const result=await api('/api/jobs/'+job+'/privacy',{masks:data.masks});dirty=false;info.textContent=result.regions+'개 영역 저장 완료. 글 미리보기에서 최종 사진을 확인하세요.';}catch(e){info.textContent=e.message;}finally{save.disabled=false;select.disabled=false;undo.disabled=false;clear.disabled=false;canvas.style.pointerEvents='';}};
 try{data=await api('/api/jobs/'+job+'/privacy');for(const p of data.photos){const o=document.createElement('option');o.value=p.id;o.textContent=p.id+' · '+p.name;select.append(o);}await load();}catch(e){info.textContent='사진 편집을 열지 못했습니다. '+e.message;save.disabled=true;}
};
