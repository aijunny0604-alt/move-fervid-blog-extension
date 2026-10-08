import base64, hashlib, json, sys
from pathlib import Path
import winreg
import PIL
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT.parent/'move-blog-helper/manifest.json').read_text(encoding='utf-8'))
digest=hashlib.sha256(base64.b64decode(manifest['key'])).hexdigest()[:32]
extension_id=''.join(chr(97+int(c,16)) for c in digest)
cmd=ROOT/'native_host.cmd'
cmd.write_text('@echo off\r\n@chcp 65001 >nul\r\n"'+sys.executable+'" -u "%~dp0native_host.py" %*\r\n',encoding='utf-8',newline='')
host={'name':'com.moveam.blogstudio','description':'Move Fervid local Codex connection','path':str(cmd),'type':'stdio','allowed_origins':['chrome-extension://'+extension_id+'/']}
path=ROOT/'native_host_manifest.json'
path.write_text(json.dumps(host,ensure_ascii=True,indent=2),encoding='utf-8')
keypath=r'Software\Google\Chrome\NativeMessagingHosts\com.moveam.blogstudio'
with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER,keypath,0,winreg.KEY_SET_VALUE) as key:
    winreg.SetValueEx(key,'',0,winreg.REG_SZ,str(path))
print('Chrome connection installed. Extension ID: '+extension_id)
