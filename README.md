# 처음 배우는 주식투자

투자 경험이 없는 대학생을 위한 8주 과정입니다. 주차별 수업은 [홈과 과정표](docs/index.md)에서 열 수 있습니다. [모의투자 기록지](docs/activities/portfolio-template.md), [주차별 활동지](docs/activities/worksheets.md), [1주차 퀴즈 해설](docs/quizzes/week01-answers.md), [2~8주차 퀴즈 해설](docs/quizzes/answers.md)을 함께 제공합니다.

[공개 학습 사이트](https://whanny74.github.io/StockInvest/)

## Windows에서 미리보기

PowerShell에서 실행합니다.

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\zensical.exe serve
```

터미널에 표시된 로컬 주소를 브라우저에서 엽니다. 정적 파일은 `.\.venv\Scripts\zensical.exe build --clean`으로 생성합니다.

## GitHub Pages 배포

1. GitHub에서 이 프로젝트를 올릴 저장소를 준비합니다. 인터넷에 공개할 자료인지 확인하고 저장소 공개 범위를 선택합니다.
2. 저장소의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
3. 이 프로젝트를 저장소의 `main` 브랜치에 올립니다. 이미 올린 상태라면 **Actions → Publish course → Run workflow**에서 실행할 수 있습니다.
4. 배포가 성공하면 **Settings → Pages**에 표시된 주소를 엽니다. 주소가 확정되면 `zensical.toml`의 `[project]` 아래에 `site_url`로 추가합니다.

수업 원본인 `docs/`를 수정하고, 새 주차 페이지는 `zensical.toml`의 메뉴에 추가합니다. 개인 기록은 로컬의 `private/` 또는 별도 개인 메모에 보관합니다.

가족 모의투자 기록의 서버 배포와 코드 설정은 [기록지 운영 안내](portfolio-api/README.md)를 참고합니다.
