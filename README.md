# 무브 · 퍼비드 블로그 확장

Windows 11 + Google Chrome용. 사진과 TXT/MD 메모를 선택해 브랜드별 글·썸네일·번호판 모자이크를 만들고 네이버 편집기에 입력합니다.

## 다른 PC에 설치

1. 이 저장소의 **Releases → 최신 버전 → move-fervid-blog-extension-windows.zip**을 내려받아 고정된 폴더에 압축을 풉니다. 비공개 저장소이므로 권한이 있는 GitHub 계정 로그인이 필요합니다.
2. Python 3.10 이상과 Codex 데스크톱을 설치하고 Codex에서 ChatGPT 계정으로 로그인합니다. Python: https://www.python.org/downloads/windows/
3. 압축을 푼 폴더의 **설치.cmd**를 실행합니다. Python 가상 환경/Pillow 설치와 현재 Windows 사용자의 Chrome 연결을 등록합니다. 관리자 권한은 필요하지 않습니다.
4. Chrome 주소창에 `chrome://extensions` → **개발자 모드 켜기 → 압축해제된 확장 프로그램을 로드합니다 → move-blog-helper 폴더** 선택.
5. Chrome에서 사용할 네이버 계정으로 로그인한 뒤 확장 아이콘을 클릭합니다.

Chrome 웹스토어 등록본은 아닙니다. ZIP만 다운로드하면 자동 설치되는 방식은 아니며 3~4단계는 최초 한 번 필요합니다. 설치 폴더를 이동했다면 설치.cmd를 다시 실행하세요.

## 사용

확장 아이콘 → 브랜드 선택 → 사진·메모 폴더 선택 → 블로그 만들기 → 글/번호판 확인 → 네이버에 글 넣기.

- 사진은 실제 원본을 사용하며 팀퍼비드만 공식 PNG 로고를 합성합니다.
- 번호판은 네 모서리와 원근 기울기에 맞춰 내부만 가립니다. 주변 범퍼까지 덮는 사각형은 사용하지 않습니다. 누락/오차는 네 모서리 선택으로 수정하세요.
- 반복·내부 검수 문장 등이 감지되면 최대 1회 자동 편집합니다. 결과 사실과 사진 연결은 사용자 확인이 필요합니다.
- 기존 내 템플릿의 하단 지도·문의 배너를 남긴 뒤 입력합니다. 제목 배경과 대표사진, 예약 시간을 확인하고 최종 발행은 네이버에서 합니다.
- 생성 중에는 Chrome을 열어 두세요. 작업 파일은 설치 폴더의 blog-studio/jobs에 저장됩니다.

## 다른 PC로 옮길 때

Git에는 사진·완성 원고·로그인·API 키를 넣지 않습니다. 새 PC에서 ChatGPT와 네이버 로그인을 각각 진행하세요. 기존 jobs 폴더가 필요하면 본인이 별도로 복사할 수 있습니다. local-config.json, bridge-config.json, native_host_manifest.json과 .blog-studio-connection.json은 복사하지 마세요.

네이버 검색량은 해당 PC의 `%USERPROFILE%/.secrets/naver_searchad.json`을 사용합니다. API_KEY, SECRET_KEY, CUSTOMER_ID 항목이 있는 JSON을 본인 검색광고 계정 값으로 별도 설정합니다. 키는 Git에 올리지 마세요. 미설정/조회 실패 시 검색량을 추정하지 않고 경고와 함께 글을 생성합니다.

Codex의 ChatGPT 로그인 사용량을 이용합니다. 별도 API 키를 자동으로 사용하지 않습니다. 모델 이용 한도와 서비스 이용 조건이 적용됩니다.

## 업데이트

작업 완료 후 Chrome을 종료하고 새 ZIP을 기존 설치 폴더에 덮어씁니다. jobs는 보존하세요. 설치.cmd 실행 후 Chrome 확장 관리에서 새로고침합니다.

## 검증 범위

Windows/Python 코드 및 기존 원고 파이프라인을 검증했습니다. 새로운 물리 PC와 Chrome에서 전체 설치·게시까지 수행한 검증은 아닙니다. macOS/Linux는 지원하지 않습니다.
