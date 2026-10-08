"""검색 의도를 유지하는 시드와 보수적인 원고 검수. 사실 검증을 대체하지 않는다."""
import re

def keyword_seeds(inp):
    source=' '.join([inp.get('details',''),*inp.get('folders',[]),*(n['text'] for n in inp.get('notes',[]))])
    compact=re.sub(r'\s+','',source).upper()
    seeds=[]
    def add(*words):
        for word in words:
            if word not in seeds: seeds.append(word)
    if 'AMGGT' in compact: add('AMGGT','벤츠AMGGT')
    for m in re.finditer(r'\b(?:BMW\s*)?(X[1-7]|M[1-8]|[1-8]\d{2}[a-zA-Z]*)\b',source,re.I):
        add('BMW'+m[1].upper())
    if '스포일러' in source: add('카본스포일러' if '카본' in source else '스포일러','리어스포일러','부산스포일러')
    if '코딩' in source: add('벤츠코딩' if ('AMG' in compact or '벤츠' in source) else 'BMW코딩' if 'BMW' in compact else '자동차코딩')
    for work in ('머플러팁','다운스프링','엔진오일','배기튜닝','브레이크','듀얼팁','얼라인먼트','타이어','자바라','서스펜션','바디킷'):
        if work in compact: add(work,'부산'+work)
    if any(x in source for x in ('듀얼팁','머플러','배기')): add('머플러팁','부산배기튜닝','머플러튜닝')
    # 임의 단어 분할은 개발 코딩 등 다른 검색 의도로 새기 쉽다.
    return seeds[:10]

def review(d,inp):
    paragraphs=[*d['intro'],*(t for p in d['photos'] for t in p['paragraphs']),d['closing']]
    body='\n'.join(paragraphs)
    issues=[]
    def issue(code,message,ids=None): issues.append({'code':code,'message':message,'photo_ids':ids or []})
    wrong='무브모터스' if inp['brand']=='fervid' else '팀퍼비드'
    if wrong in body or wrong in d['title']: issue('brand','다른 브랜드의 상호가 들어갔습니다.')
    meta=re.compile(r'(?:설명|작업).*확대하지|(?:설명|해석)하지\s*않|사진\s*자료.{0,15}(?:없|제외)|증빙|판단하지|안내\s*범위|포함한\s*작업은\s*아닙니다')
    leaked=[p['id'] for p in d['photos'] if any(meta.search(t) for t in p['paragraphs'])]
    if leaked: issue('internal_notes','본문에 검수·제외 범위를 설명하는 문장이 있습니다. 독자에게 필요한 작업 설명만 남기세요.',leaked)
    seen={}; repeats=[]
    for p in d['photos']:
        for t in p['paragraphs']:
            for sentence in re.split(r'(?<=[.!?])\s+',t):
                key=re.sub(r'\s+','',sentence)
                if len(key)<25: continue
                if key in seen: repeats.extend([seen[key],p['id']])
                else: seen[key]=p['id']
    if repeats: issue('repetition','같은 문장이 여러 사진에서 반복됩니다.',list(dict.fromkeys(repeats)))
    short=[p['id'] for p in d['photos'] if len(''.join(p['paragraphs']))<140]
    if len(short)>len(d['photos'])*.6: issue('shallow','사진 설명의 60% 이상이 140자 미만입니다. 핵심 공정의 이유·구조 설명을 확인하세요.',short)
    phrase='스포일러 기능 OFF'
    if body.count(phrase)>5: issue('repeated_scope','같은 코딩 작업 범위가 6번 이상 반복됩니다. 도입·코딩 공정·마무리에 집중하세요.')
    return {'status':'확인 필요' if issues else '기계 검수 통과', 'issues':issues,
            'characters':len(body),'photos':len(d['photos']),
            'note':'자동 검수는 반복·형식의 일부만 확인합니다. 사진 해석과 실제 수행 사실은 별도 확인이 필요합니다.'}
