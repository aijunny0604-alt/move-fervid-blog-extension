$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
try {
    $pythonCommand=Get-Command python -ErrorAction SilentlyContinue
    $launcher=Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) { & $launcher.Source -3 -m venv .venv }
    elseif ($pythonCommand) { & $pythonCommand.Source -m venv .venv }
    else { throw 'Python 3.10 이상을 먼저 설치하세요: https://www.python.org/downloads/windows/' }
    if ($LASTEXITCODE -ne 0) { throw 'Python 가상 환경 생성에 실패했습니다. Python 설치를 확인하세요.' }
    $venvPython=Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
    & $venvPython -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Pillow 설치 실패. 인터넷 연결을 확인하세요.' }
    & $venvPython (Join-Path $PSScriptRoot 'blog-studio\install_native.py')
    if ($LASTEXITCODE -ne 0) { throw 'Chrome 연결 등록 실패' }
    Write-Host '설치 완료.' -ForegroundColor Green
    Write-Host 'Chrome 주소창: chrome://extensions'
    Write-Host '개발자 모드 → 압축해제된 확장 프로그램을 로드합니다 → 다음 폴더 선택:'
    Write-Host (Join-Path $PSScriptRoot 'move-blog-helper') -ForegroundColor Cyan
    Write-Host '이 폴더를 옮기면 설치.cmd를 다시 실행하세요. Codex에서 ChatGPT 로그인이 필요합니다.'
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
