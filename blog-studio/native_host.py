"""Chrome Native Messaging: 연결과 로컬 엔진 시작만 담당."""
import sys, os, struct, json, threading, time, hashlib, base64
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parent
if os.name=='nt':
    import msvcrt
    msvcrt.setmode(sys.stdin.fileno(),os.O_BINARY)
    msvcrt.setmode(sys.stdout.fileno(),os.O_BINARY)
STDOUT=sys.stdout.buffer
def extension_id():
    m=json.loads((ROOT.parent/'move-blog-helper/manifest.json').read_text(encoding='utf-8'))
    h=hashlib.sha256(base64.b64decode(m['key'])).hexdigest()[:32]
    return ''.join(chr(97+int(c,16)) for c in h)
def read_message(stream):
    prefix=stream.read(4)
    if not prefix: return None
    if len(prefix)!=4: raise ValueError('메시지 길이 오류')
    n=struct.unpack('<I',prefix)[0]
    if not 0<n<=16384: raise ValueError('허용하지 않은 메시지 크기')
    data=stream.read(n)
    if len(data)!=n: raise ValueError('메시지 누락')
    return json.loads(data.decode('utf-8'))
def send_message(message):
    b=json.dumps(message,ensure_ascii=False).encode('utf-8')
    STDOUT.write(struct.pack('<I',len(b))+b);STDOUT.flush()
def run():
    expected='chrome-extension://'+extension_id()+'/'
    if len(sys.argv)<2 or sys.argv[1]!=expected: return 2
    # 서버의 일반 출력은 Native Messaging 프레임에 섞이지 않게 stderr로 보냄.
    sys.stdout=sys.stderr
    import server
    started=False
    def probe():
        req=Request(f'http://127.0.0.1:{server.PORT}/api/status',headers={'Authorization':'Bearer '+server.TOKEN})
        with urlopen(req,timeout=2) as r:
            data=json.load(r)
            if 'jobs' not in data: raise ValueError('다른 프로그램의 응답')
    while True:
        message=read_message(sys.stdin.buffer)
        if message is None: return 0
        try:
            if message != {'action':'connect'}: raise ValueError('지원하지 않는 동작')
            try: probe()
            except Exception:
                if not started:
                    threading.Thread(target=server.main,daemon=True).start();started=True
                last=None
                for attempt in range(30):
                    try: probe();last=None;break
                    except Exception as e: last=e;time.sleep(.2)
                if last: raise ValueError('로컬 엔진 연결 실패. 다른 설치본의 실행 창이 열려 있다면 종료 후 다시 연결하세요.')
            send_message({'ok':True,'url':f'http://127.0.0.1:{server.PORT}','token':server.TOKEN})
        except Exception as e:
            send_message({'ok':False,'error':str(e)})
if __name__=='__main__':
    try: sys.exit(run())
    except Exception:
        # 인증값과 요청 본문은 콘솔/로그에 남기지 않는다.
        sys.exit(1)
