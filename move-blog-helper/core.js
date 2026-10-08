(() => {
  'use strict';
  const norm = s => String(s ?? '').normalize('NFC').replace(/[\s\u200b\ufeff]/g, '');
  function path(value) {
    if (typeof value !== 'string' || !value || value.length > 240 || /[\\:\x00-\x1f]/.test(value) || value.startsWith('/') || value.split('/').some(x => !x || x === '.' || x === '..')) throw Error('올바르지 않은 사진 경로입니다.');
    if (!/\.(png|jpe?g|webp)$/i.test(value)) throw Error('사진은 PNG/JPG/WebP 파일이어야 합니다.');
    return value.normalize('NFC');
  }
  function paragraphs(value, label) {
    if (!Array.isArray(value) || !value.length || value.some(x => typeof x !== 'string' || !x.trim() || x.length > 12000)) throw Error(label + ' 문단 형식을 확인해 주세요.');
    return value;
  }
  function validate(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 100) throw Error('제목이 없거나 100자를 초과합니다.');
    if (!/^[a-zA-Z0-9_-]{2,50}$/.test(raw.blog_id || '')) throw Error('블로그 ID를 확인해 주세요.');
    if (!Array.isArray(raw.photos) || raw.photos.length < 1 || raw.photos.length > 100) throw Error('작업 사진은 1~100장이어야 합니다.');
    const photos = raw.photos.map(p => ({file:path(p.file), layout:'extend', paragraphs:paragraphs(p.paragraphs, '사진별 설명')}));
    if (new Set(photos.map(p => p.file.split('/').pop())).size !== photos.length) throw Error('작업 사진 파일명이 중복되었습니다. 서로 다른 폴더라도 파일명은 달라야 합니다.');
    if (typeof raw.closing !== 'string' || !raw.closing.trim() || raw.closing.length > 12000) throw Error('마무리 문단을 확인해 주세요.');
    const result = {title:raw.title.trim(), blog_id:raw.blog_id, thumbnail:path(raw.thumbnail), photos, intro:paragraphs(raw.intro,'도입'), closing:raw.closing, title_background:raw.title_background ? path(raw.title_background) : null, footer_template:String(raw.footer_template || ''), scheduled_at:raw.scheduled_at || ''};
    if (result.scheduled_at && !/^\d{4}-\d{2}-\d{2}T\d{2}:[0-5]0:00\+09:00$/.test(result.scheduled_at)) throw Error('예약 시간은 한국시간, 10분 단위여야 합니다.');
    if (result.scheduled_at && !Number.isFinite(Date.parse(result.scheduled_at))) throw Error('예약 날짜가 올바르지 않습니다.');
    if (result.scheduled_at && new Date(Date.parse(result.scheduled_at)+9*60*60*1000).toISOString().slice(0,19)!==result.scheduled_at.slice(0,19)) throw Error('존재하지 않는 예약 날짜입니다.');
    return result;
  }
  function plan(data) {
    const steps = [{type:'title',text:data.title}, {type:'image',file:data.thumbnail,layout:'normal',representative:true}];
    for (const text of data.intro) steps.push({type:'text',text});
    for (const photo of data.photos) {
      steps.push({type:'image',file:photo.file,layout:'extend'});
      for (const text of photo.paragraphs) steps.push({type:'text',text});
    }
    steps.push({type:'text',text:data.closing});
    return steps;
  }
  function units(blocks) {
    const result = [];
    for (const block of blocks) {
      if (block.type === 'title') continue;
      if (block.type === 'text' && !norm(block.text)) continue;
      const item = block.type === 'image' ? {type:'image',file:block.file.split('/').pop().normalize('NFC'),layout:block.layout} : {type:block.type,text:norm(block.text)};
      if (item.type === 'text' && result.at(-1)?.type === 'text') result.at(-1).text += item.text;
      else result.push(item);
    }
    return result;
  }
  function matches(actual, expected) { return JSON.stringify(units(actual)) === JSON.stringify(units(expected)); }
  function filesNeeded(data) { return [...new Set([data.thumbnail,...data.photos.map(p=>p.file),...(data.title_background ? [data.title_background] : [])])]; }
  function fileMap(files) {
    const map = new Map();
    for (const file of files) {
      const name=(file.webkitRelativePath || file.name).split('/').slice(file.webkitRelativePath ? 1 : 0).join('/').normalize('NFC');
      if(map.has(name)) throw Error('동일한 이름의 파일이 있습니다: '+name);
      map.set(name,file);
    }
    return map;
  }
  function unpack(bundle) {
    if(bundle?.format!=='move-blog-pack' || bundle.version!==1 || !Array.isArray(bundle.assets)) throw Error('블로그 작업 파일(.moveblog) 형식이 아닙니다.');
    const data=validate(bundle.article),needed=new Set(filesNeeded(data)),files=new Map();
    if(bundle.assets.length!==needed.size)throw Error('사진 개수가 원고와 다릅니다.');
    let total=0;
    for(const asset of bundle.assets){
      const name=path(asset.path);
      if(!needed.has(name)||files.has(name))throw Error('사진 경로 중복 또는 불일치: '+name);
      if(!['image/jpeg','image/png','image/webp'].includes(asset.mime)||typeof asset.base64!=='string'||!asset.base64.length||asset.base64.length>42*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(asset.base64))throw Error('사진 데이터 오류: '+name);
      const raw=atob(asset.base64);total+=raw.length;
      if(total>200*1024*1024)throw Error('작업 파일의 사진 총용량이 너무 큽니다.');
      const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
      const png=bytes[0]===137&&raw.slice(1,4)==='PNG',jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255,webp=raw.slice(0,4)==='RIFF'&&raw.slice(8,12)==='WEBP';
      if(!(asset.mime==='image/png'&&png||asset.mime==='image/jpeg'&&jpg||asset.mime==='image/webp'&&webp))throw Error('사진 형식이 일치하지 않습니다: '+name);
      files.set(name,new File([bytes],name.split('/').pop(),{type:asset.mime}));
    }
    return {data,files};
  }
  const api={norm,path,validate,plan,units,matches,filesNeeded,fileMap,unpack};
  if(typeof module !== 'undefined' && module.exports) module.exports=api;
  else globalThis.MoveBlogCore=api;
})();
