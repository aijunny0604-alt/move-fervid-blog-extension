"""번호판 윤곽 안쪽만 처리. 원본과 윤곽 바깥 픽셀은 보존."""
import math
from PIL import Image, ImageDraw

def points(b):
    if len(b)==4:
        x,y,r,t=b
        return [(x,y),(r,y),(r,t),(x,t)]
    return list(zip(b[::2],b[1::2]))

def validate_masks(value, ids):
    if not isinstance(value,dict) or set(value)!=set(ids): raise ValueError('모든 사진의 모자이크 영역을 확인해 주세요.')
    for boxes in value.values():
        if not isinstance(boxes,list) or len(boxes)>40: raise ValueError('사진당 영역은 40개까지입니다.')
        for b in boxes:
            if not isinstance(b,list) or len(b) not in (4,8) or any(type(x) not in (int,float) or not math.isfinite(x) or not 0<=x<=1 for x in b): raise ValueError('모자이크 좌표 오류')
            if len(b)==4 and (b[0]>=b[2] or b[1]>=b[3]): raise ValueError('모자이크 좌표 오류')
            q=points(b);cross=[]
            for i in range(4):
                a,c,d=q[i],q[(i+1)%4],q[(i+2)%4]
                cross.append((c[0]-a[0])*(d[1]-c[1])-(c[1]-a[1])*(d[0]-c[0]))
            if not (all(x>1e-10 for x in cross) or all(x< -1e-10 for x in cross)): raise ValueError('네 모서리를 테두리 순서대로 선택해 주세요.')
    return value

def redact(im, boxes):
    result=im.convert('RGB').copy();w,h=result.size
    for b in boxes:
        q=[(x*w,y*h) for x,y in points(b)]
        box=(max(0,math.floor(min(x for x,y in q))),max(0,math.floor(min(y for x,y in q))),min(w,math.ceil(max(x for x,y in q))+1),min(h,math.ceil(max(y for x,y in q))+1))
        patch=result.crop(box)
        small=patch.resize((min(8,patch.width),min(3,patch.height)),Image.Resampling.BOX).resize(patch.size,Image.Resampling.NEAREST)
        mask=Image.new('L',patch.size,0)
        ImageDraw.Draw(mask).polygon([(round(x-box[0]),round(y-box[1])) for x,y in q],fill=255)
        result.paste(small,box,mask)
    return result
