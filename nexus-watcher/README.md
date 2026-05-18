# nexus-watcher

NEXUS Studio 네트워크 폴더 자동 감시 에이전트.
지정한 네트워크 공유 폴더에 새로 추가되는 이미지를 자동으로 감지해 **Cloudinary 에 업로드**하고
**Firestore 에 색인 문서를 생성**합니다.

## 구성 파일

| 파일 | 역할 |
|---|---|
| `package.json` | 의존성/스크립트 |
| `.env` | Firebase / Cloudinary 자격증명 (직접 채워야 함) |
| `config.json` | 감시 대상 폴더 / 확장자 / 제외 키워드 / 스캔 주기 |
| `watcher.js` | 메인 진입점 (chokidar + 주기 스캔) |
| `uploader.js` | Cloudinary 업로드 / Firestore 색인 |
| `scanner.js` | 폴더 재귀 스캔 / 메타데이터 추출 |
| `processed.json` | 처리 완료 파일 캐시 (자동 생성) |
| `error.log` | 오류 로그 (자동 생성, append-only) |

## 1. 사전 준비

### Node.js
- Node 18 이상.

### Firebase Admin SDK 서비스 계정
1. Firebase Console → 프로젝트 설정 → **서비스 계정** → **새 비공개 키 생성** → JSON 다운로드
2. JSON 안의 `project_id`, `client_email`, `private_key` 세 값을 `.env` 에 채워 넣는다.
3. `private_key` 는 `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n` 형태로 줄바꿈이 `\n` 리터럴인 상태로 그대로 붙여 넣고 큰따옴표로 감싼다.

### Cloudinary
1. https://cloudinary.com → Dashboard → Settings → Access Keys
2. `cloud_name`, `api_key`, `api_secret` 세 값을 `.env` 에 채운다.

### NEXUS_APP_ID
- 프로젝트가 사용하는 Firestore 컬렉션 경로 prefix.
- 메인 앱의 `src/lib/firebase.js` 에 정의된 `appId` 와 동일한 값을 사용.

## 2. 설치

```bash
cd nexus-watcher
npm install
```

## 3. 설정 (`config.json`)

```json
{
  "watch": [
    {
      "path": "\\\\ppc-file\\배너\\",
      "app": "banner-codex",
      "game": "리니지",
      "year": "2025"
    },
    {
      "path": "\\\\ppc-file\\프로모션\\",
      "app": "promotion-archive",
      "game": "아이온"
    }
  ],
  "interval": 300,
  "extensions": [".jpg", ".jpeg", ".png", ".webp"],
  "exclude": ["old", "개발", "팝업", "guide"]
}
```

| 필드 | 설명 |
|---|---|
| `watch[].path` | UNC 네트워크 경로. 백슬래시는 JSON 에서 `\\\\` 로 이스케이프. |
| `watch[].app` | `banner-codex` 또는 `promotion-archive` (Firestore 컬렉션 매핑) |
| `watch[].game` / `watch[].year` | 새 문서 기본값 |
| `interval` | 풀 스캔 주기(초). 최소 60 초. |
| `extensions` | 처리 대상 확장자 (소문자 비교) |
| `exclude` | 디렉터리/파일 이름에 포함되면 무시 (부분일치, 대소문자 무시) |

### 컬렉션 경로 매핑

| `app` | Firestore 컬렉션 |
|---|---|
| `banner-codex` | `artifacts/{NEXUS_APP_ID}/public/data/banners` |
| `promotion-archive` | `artifacts/{NEXUS_APP_ID}/public/data/promotion-banners` |

## 4. 실행

```bash
# 상주 (이벤트 감시 + 주기 풀 스캔)
npm run start

# 한 번만 풀 스캔 후 종료 (cron / 수동 동기화용)
npm run sync
```

시작 시:
1. 초기 풀 스캔 — 모든 watch 경로를 재귀 탐색해서 누락 파일을 색인.
2. chokidar 가 이벤트 기반 감시 시작 (UNC 안정성을 위해 polling 모드).
3. `interval` 마다 풀 스캔 한 번 더 실행 (이벤트 누락 보정).

## 5. 동작

각 파일에 대해:
1. **확장자/제외 필터** 적용
2. **로컬 캐시(`processed.json`)** 확인 → 이미 있으면 skip
3. 파일 **크기 안정화** 대기 (네트워크 복사 중 업로드 방지)
4. **메타데이터 추출** — 파일명/부모 폴더에서 year/month 추론
5. **Firestore 중복 체크** — 같은 `sourcePath` 가 있으면 skip + 캐시 동기화
6. **Cloudinary 업로드** — 원본 1회 업로드, transformation URL 로 `preview`(600w) / `full_image`(2000w) 생성
7. **Firestore 문서 생성** — `source: "nexus-watcher"` 필드로 watcher 가 만든 것 식별 가능

## 6. 생성되는 Firestore 문서 스키마

```js
{
  title: "filename without extension",
  game: "리니지",
  year: "2025",
  month: "05",
  date: "2025.05.18",
  path: "\\\\ppc-file\\배너\\2025\\05\\new.png",  // 원본 경로
  sourcePath: "2025/05/new.png",                     // watch 루트 기준 상대경로 (dedup 키)
  tags: [],
  preview: "https://res.cloudinary.com/.../w_600/.../new.png",
  full_image: "https://res.cloudinary.com/.../w_2000/.../new.png",
  cloudinaryPublicId: "nexus-watcher/banner-codex/abc123",
  width: 1920, height: 1080, bytes: 230488,
  source: "nexus-watcher",
  created_at: <serverTimestamp>
}
```

## 7. 운영 팁

- **권한**: 실행 사용자가 UNC 경로(`\\ppc-file\...`)를 읽을 수 있어야 함. Windows 서비스로 등록할 때 도메인 계정 필요.
- **재시작 안전**: `processed.json` 으로 캐시되어 재시작 후에도 중복 업로드되지 않음.
- **수동 재처리**: 특정 파일을 다시 올리고 싶으면 `processed.json` 에서 해당 키를 지우거나 Firestore 문서를 삭제.
- **에러 추적**: `error.log` 가 append-only 로 쌓임. 주기적으로 비우거나 logrotate 적용.

## 8. 보안

- `.env`, `processed.json`, `error.log`, `node_modules/` 는 **git 에 커밋하지 말 것**.
- 별도 `.gitignore` 를 두는 게 안전:
  ```
  .env
  processed.json
  error.log
  node_modules/
  ```

## 9. 트러블슈팅

| 증상 | 점검 |
|---|---|
| `FIREBASE_PRIVATE_KEY` 오류 | `.env` 의 키가 `"-----BEGIN..."` 형태로 큰따옴표 + `\n` 리터럴인지 확인 |
| UNC 경로 접근 거부 | 실행 계정에 공유 폴더 읽기 권한 있는지 확인 (`net use \\ppc-file /user:...`) |
| 이벤트가 안 잡힘 | SMB 공유는 OS 가 inotify 를 전달 안 함 — watcher 는 polling 모드라 5 초 지연 이내에는 잡힘. 그래도 누락되면 `interval` 풀 스캔으로 보정. |
| `Cannot resolve entry module` | `cd nexus-watcher && npm install` 다시 실행 |
| 동일 파일이 매번 새로 올라감 | Firestore 의 `sourcePath` 필드가 비어있거나 다름 — `processed.json` 과 Firestore 양쪽 모두 확인 |
