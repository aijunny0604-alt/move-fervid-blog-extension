(() => {
  'use strict';
  const C=globalThis.MoveBlogCore;
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const shown=e=>e && e.getClientRects().length && getComputedStyle(e).visibility!=='hidden';
  const clean=e=>{if(!e)return '';const c=e.cloneNode(true);c.querySelectorAll('.se-placeholder,.se-placeholder-text').forEach(x=>x.remove());return c.textContent.replace(/[\u200b\ufeff]/g,'').trim();};
  const components=()=>[...document.querySelectorAll('.se-component')];
  const title=()=>document.querySelector('.se-documentTitle .se-text-paragraph');
  const significant=()=>components().filter(e=>!e.matches('.se-documentTitle') && (!e.matches('.se-text') || C.norm(clean(e))));
  async function until(test,label,limit=8000){const end=Date.now()+limit;while(Date.now()<end){if(test())return;await pause(100);}throw Error(label);}
  function click(e){if(!e)throw Error('편집기 버튼을 찾지 못했습니다.');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();for(const type of ['mousedown','mouseup','click'])e.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,view:window,clientX:r.left+Math.min(r.width/2,120),clientY:r.top+Math.min(r.height/2,12),button:0,buttons:type==='mousedown'?1:0}));}
  function receiver(){let doc=document;for(let i=0;i<5;i++){const a=doc.activeElement;if(a?.tagName!=='IFRAME')return {doc,el:a};try{doc=a.contentDocument;}catch{throw Error('입력 프레임 접근 실패');}if(!doc)break;}throw Error('입력 위치 확인 실패');}
  async function activate(p){click(p);await pause(150);const r=receiver();if(!r.el?.isContentEditable)throw Error('네이버가 입력 위치를 선택하지 않았습니다. 본문 클릭 후 다시 확인해 주세요.');r.el.focus();return r;}
  function enter(r){for(const type of ['keydown','keypress','keyup'])r.el.dispatchEvent(new r.doc.defaultView.KeyboardEvent(type,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));}
  function imageName(e){const img=e.querySelector('img');const alt=img?.getAttribute('alt');if(alt && /\.(png|jpe?g|webp)$/i.test(alt))return alt;const src=img?.getAttribute('src') || '';if(!/^https:\/\//.test(src))return '';try{return decodeURIComponent(new URL(src).pathname.split('/').pop());}catch{return '';}}
  function unit(e){if(e.matches('.se-text'))return {type:'text',text:clean(e)};if(e.matches('.se-image'))return {type:'image',file:imageName(e),layout:e.querySelector('.se-component-content-extend')?'extend':'normal'};return {type:'unknown',text:e.className};}
  function footerStamp(e){return {id:e.id,type:e.className.split(/\s+/).filter(x=>x&&!x.startsWith('se-is-')).join(' '),text:clean(e).replace(/사진 설명을 입력하세요\./g,''),images:e.querySelectorAll('img').length};}
  class Writer {
    constructor(data,steps,files){this.data=data;this.steps=steps;this.files=files;this.cursor=0;this.stopped=false;this.baseline=[];this.initial=[];this.started=false;}
    checkBlog(){const u=new URL(location.href);const actual=u.searchParams.get('blogId');if(actual!==this.data.blog_id)throw Error('블로그 ID 불일치: 원고 '+this.data.blog_id+' / 현재 '+(actual||'확인 불가'));}
    start(keepFooter){this.checkBlog();if(!title())throw Error('네이버 글쓰기 편집기를 찾지 못했습니다.');const existing=C.norm(clean(title()));if(existing && existing!==C.norm(this.data.title))throw Error('기존 제목이 있는 글에는 입력하지 않습니다. 새 글을 열어 주세요.');const body=significant();if(body.some(e=>C.norm(clean(e)).includes(C.norm(this.data.intro[0]))))throw Error('이미 원고가 입력된 글입니다. 중복 입력하지 않습니다.');if(body.length && !keepFooter)throw Error('기존 본문이 있습니다. 하단 템플릿만 남긴 새 글인지 확인해 주세요.');this.baseline=body.map(e=>e.id);if(this.baseline.some(id=>!id))throw Error('템플릿 요소 식별 실패');this.initial=body.map(footerStamp);this.cursor=existing?1:0;this.started=true;this.check();}
    check(){this.checkBlog();const all=significant(),current=all.filter(e=>this.baseline.includes(e.id));if(JSON.stringify(current.map(footerStamp))!==JSON.stringify(this.initial))throw Error('하단 템플릿이 변경되어 중지했습니다.');const prefix=all.filter(e=>!this.baseline.includes(e.id));if(this.baseline.length && all.slice(-this.baseline.length).some((e,i)=>e.id!==this.baseline[i]))throw Error('기존 템플릿 앞의 입력 순서가 달라졌습니다.');if(!C.matches(prefix.map(unit),this.steps.slice(0,this.cursor)))throw Error('본문이 예상 입력 내용과 다릅니다. 중복 입력을 막기 위해 중지했습니다.');const expected=this.cursor?this.data.title:'';if(C.norm(clean(title()))!==C.norm(expected))throw Error('제목이 변경되어 중지했습니다.');}
    async slot(){
      const all=components().filter(e=>!e.matches('.se-documentTitle'));
      const boundary=this.baseline.length?all.findIndex(e=>e.id===this.baseline[0]):all.length;
      if(boundary<0)throw Error('하단 템플릿 위치를 찾지 못했습니다.');
      const last=all[boundary-1];
      let p=last?.matches('.se-text')?[...last.querySelectorAll('.se-text-paragraph')].at(-1):null;
      if(!p || C.norm(clean(p))){
        const edge=boundary<all.length?all[boundary].querySelector('.se-component-edge-button-top'):last?.querySelector('.se-component-edge-button-bottom') || document.querySelector('button.se-canvas-bottom-button');
        const old=p;click(edge);
        await until(()=>{const now=components().filter(e=>!e.matches('.se-documentTitle'));const b=this.baseline.length?now.findIndex(e=>e.id===this.baseline[0]):now.length;const tail=now[b-1];p=tail?.matches('.se-text')?[...tail.querySelectorAll('.se-text-paragraph')].at(-1):null;return p && p!==old && !C.norm(clean(p));},'빈 입력 문단을 만들지 못했습니다.');
      }
      this.check();return p;
    }
    async text(step){const p=await this.slot();const r=await activate(p);if(!r.doc.execCommand('insertText',false,step.text))throw Error('본문 입력 거부');await until(()=>C.matches(significant().filter(e=>!this.baseline.includes(e.id)).map(unit),this.steps.slice(0,this.cursor+1)),'본문 반영 확인 실패');enter(r);await pause(120);enter(receiver());await pause(120);}
    async image(step){
      await activate(await this.slot());
      const before=new Set(components().map(e=>e.id));
      const input=()=>[...document.querySelectorAll('input[type="file"]')].find(e=>/image|\.png|\.jpg/i.test(e.accept||''));
      if(!input()){const button=document.querySelector('button[data-name="image"],button[data-name="photo"],.se-image-toolbar-button');click(button);await until(input,'사진 업로드 입력란을 찾지 못했습니다. 사진 버튼을 한 번 열고 파일 선택을 취소한 뒤 다시 시도해 주세요.');}
      const file=this.files.get(step.file);if(!file)throw Error('사진 파일 없음: '+step.file);
      const dt=new DataTransfer();dt.items.add(file);input().files=dt.files;input().dispatchEvent(new Event('change',{bubbles:true}));
      let img;await until(()=>{const added=components().filter(e=>e.matches('.se-image')&&!before.has(e.id));if(added.length>1)throw Error('예상보다 많은 사진이 추가됐습니다.');img=added[0];return img && imageName(img)===file.name;},'사진 업로드 완료를 확인하지 못했습니다. 재업로드하지 말고 편집기를 확인해 주세요.',60000);
      click(img.querySelector('img'));await pause(150);
      const option=step.layout==='extend'?'옆트임':'문서 너비';
      const button=[...img.querySelectorAll('button')].find(b=>shown(b)&&b.textContent.trim()===option);
      click(button);await until(()=>!!img.querySelector('.se-component-content-extend')===(step.layout==='extend'),'사진 크기 반영 확인 실패');
      if(step.representative){const rep=img.querySelector('.se-set-rep-image-button');if(rep&&!rep.classList.contains('se-is-selected'))click(rep);}
    }
    async next(){if(!this.started)throw Error('먼저 입력 시작을 눌러 주세요.');this.check();if(this.cursor>=this.steps.length)return false;const step=this.steps[this.cursor];if(step.type==='title'){const r=await activate(title());if(!r.doc.execCommand('insertText',false,step.text))throw Error('제목 입력 실패');await until(()=>C.norm(clean(title()))===C.norm(step.text),'제목 반영 확인 실패');}else if(step.type==='text')await this.text(step);else await this.image(step);this.cursor++;this.check();return true;}
  }
  globalThis.MoveBlogAdapter={Writer,ready:()=>!!title()};
})();
