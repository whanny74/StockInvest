# 가족 모의투자 기록지 운영

학습 화면과 기록지 주소는 GitHub Pages에 있습니다. Cloudflare Worker가 가족 공용 코드를 확인하고 D1에 기록을 저장합니다. 사람 이름은 가족 내에서 기록을 구분하는 표시입니다. 공용 코드를 알면 등록된 사람의 기록을 조회·수정할 수 있습니다.

## 로컬 확인

저장소 루트에서 PowerShell을 두 개 엽니다. 개발용 코드는 로컬 테스트에만 씁니다.

```powershell
npx --yes wrangler@4.168.0 d1 migrations apply DB --config portfolio-api/wrangler.toml --local
npx --yes wrangler@4.168.0 dev --config portfolio-api/wrangler.toml --ip 127.0.0.1 --port 8787 --var SITE_ORIGIN:http://127.0.0.1:8766 --var FAMILY_CODE:StockInvest_Local_Demo_2026
```

```powershell
.\.venv\Scripts\zensical.exe serve --dev-addr 127.0.0.1:8766
```

브라우저에서 `http://127.0.0.1:8766/activities/portfolio-template/`을 엽니다. 운영 데이터와 로컬 테스트 데이터는 별도입니다.

## 운영 배포

1. 배포 관리자가 `npx --yes wrangler@4.168.0 login`으로 Cloudflare에 로그인합니다.
2. `npx --yes wrangler@4.168.0 d1 create stockinvest-family-records`로 D1 데이터베이스를 만듭니다. 여기에 나온 데이터베이스 ID를 `portfolio-api/wrangler.toml`의 `database_id`에 넣습니다.
3. `npx --yes wrangler@4.168.0 d1 migrations apply DB --config portfolio-api/wrangler.toml --remote`로 스키마를 적용하고 `npx --yes wrangler@4.168.0 deploy --config portfolio-api/wrangler.toml`로 Worker를 배포합니다.
4. 암호 관리자에서 영문·숫자·밑줄·하이픈 중 무작위 24자 이상으로 가족 코드를 생성합니다. `npx --yes wrangler@4.168.0 secret put FAMILY_CODE --config portfolio-api/wrangler.toml`로 입력합니다. 코드는 사용자에게 별도로 전달하고 소스·GitHub 변수·브라우저 번들에 넣지 않습니다. 값을 바꾸면 기존 코드는 바로 만료됩니다.
5. Worker 배포 후 출력된 `https://…workers.dev` 주소를 `docs/assets/portfolio-config.js`에 넣고 기존 저장소의 `main`에 올립니다. GitHub Pages 배포 후 기존 주소에 접속해 두 브라우저에서 조회가 되는지 검증합니다.

현재 배포 관리 PC의 Windows 자격 증명 보관함에 저장된 코드는 저장소 루트에서 `.\portfolio-api\Copy-FamilyCode.ps1`을 실행해 클립보드로 복사할 수 있습니다. 공유가 끝나면 일반 텍스트를 복사해 클립보드의 코드를 덮어씁니다. 관리자가 다르면 해당 관리자가 보관하는 코드를 사용합니다.

브라우저에서 **JSON 내려받기**를 누르면 선택한 사람의 기록을 받습니다. 전체 데이터베이스의 관리자용 사본은 다음 명령으로 만들 수 있습니다.

```powershell
New-Item -ItemType Directory -Path private -Force
npx --yes wrangler@4.168.0 d1 export DB --config portfolio-api/wrangler.toml --remote --output private/portfolio-backup.sql
```
