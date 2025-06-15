# C-Terminal Community

C-Terminal 코딩 교육 플랫폼의 커뮤니티 웹사이트입니다. 블록 코딩과 터미널 기반 출력을 결합한 새로운 방식의 코딩 교육을 제공합니다.

## 주요 기능

### 🚀 핵심 기능
- **구글 계정 연동 로그인** - 간편한 소셜 로그인
- **커뮤니티 게시판** - 질문, 프로젝트 공유, 토론, 도움말
- **프로젝트 공유** - .ctm 파일 업로드 및 다운로드
- **GitHub 스타일 프로필** - 개인 활동 내역 및 통계
- **실시간 상호작용** - 좋아요, 댓글, 파일 첨부

### 💻 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Cloudflare Workers
- **Storage**: Cloudflare KV, R2 Bucket
- **Authentication**: Google OAuth 2.0
- **Hosting**: Cloudflare Pages

## 🛠️ Cloudflare Pages 설정 방법

### 1. Cloudflare 계정 설정
1. [Cloudflare](https://cloudflare.com)에 계정을 생성하세요
2. Cloudflare Dashboard에 로그인하세요

### 2. Pages 프로젝트 생성
1. Cloudflare Dashboard에서 **Pages** 메뉴로 이동
2. **Create a project** 클릭
3. **Connect to Git** 또는 **Upload assets** 선택
4. 프로젝트 이름을 `c-terminal-community`로 설정

### 3. 빌드 설정
```
Build command: (비워두기)
Build output directory: (비워두기)
```

### 4. 환경 변수 설정 (선택사항)
Pages 설정에서 Environment Variables 추가:
- `GOOGLE_CLIENT_ID`: 구글 OAuth 클라이언트 ID

### 5. 필요한 Cloudflare 리소스 생성

#### KV Namespaces 생성
다음 KV namespaces를 생성하세요:
```bash
# Cloudflare CLI를 사용하여 생성
wrangler kv:namespace create "USERS"
wrangler kv:namespace create "POSTS" 
wrangler kv:namespace create "PROJECTS"
wrangler kv:namespace create "COMMENTS"
wrangler kv:namespace create "LIKES"
```

#### R2 Bucket 생성
파일 저장을 위한 R2 bucket 생성:
```bash
wrangler r2 bucket create c-terminal-files
```

### 6. Worker 연결 설정
1. Pages 프로젝트 설정에서 **Functions** 탭으로 이동
2. **KV namespace bindings** 추가:
   - `USERS` → 생성한 USERS namespace
   - `POSTS` → 생성한 POSTS namespace  
   - `PROJECTS` → 생성한 PROJECTS namespace
   - `COMMENTS` → 생성한 COMMENTS namespace
   - `LIKES` → 생성한 LIKES namespace

3. **R2 bucket bindings** 추가:
   - `FILES` → 생성한 R2 bucket

### 7. 구글 OAuth 설정
1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트 생성
2. **APIs & Services** → **Credentials**로 이동
3. **Create Credentials** → **OAuth 2.0 Client IDs** 선택
4. **Web application** 선택
5. **Authorized JavaScript origins**에 도메인 추가:
   ```
   https://your-project-name.pages.dev
   https://your-custom-domain.com (있다면)
   ```
6. Client ID를 복사하여 `app.js`의 `YOUR_GOOGLE_CLIENT_ID` 부분에 입력

## 📁 프로젝트 구조

```
c-terminal-community/
├── index.html          # 메인 HTML 파일
├── styles.css          # CSS 스타일시트
├── app.js             # 프론트엔드 JavaScript
├── _worker.js         # Cloudflare Worker (백엔드)
├── logo.svg           # C-Terminal 로고
└── README.md          # 프로젝트 문서
```

## 🎨 사용자 인터페이스

### 메인 페이지
- **Hero Section**: C-Terminal 소개 및 터미널 프리뷰
- **Features**: 주요 기능 소개 카드
- **How it works**: 사용 방법 단계별 설명

### 커뮤니티 페이지
- **카테고리 필터**: 전체, 질문, 프로젝트 공유, 토론, 도움말
- **게시글 카드**: 제목, 내용, 작성자, 시간, 좋아요, 댓글 수
- **게시글 작성**: 모달 창을 통한 새 게시글 작성

### 프로젝트 페이지
- **프로젝트 그리드**: 카드 형태의 프로젝트 목록
- **프로젝트 업로드**: .ctm 파일 업로드 및 메타데이터 입력
- **다운로드 기능**: 프로젝트 파일 다운로드

### 프로필 페이지
- **GitHub 스타일**: 프로필 사진, 통계, 활동 내역
- **탭 시스템**: 내 게시글, 내 프로젝트, 활동 내역

## 🔧 개발 가이드

### 로컬 개발 환경 설정
1. 프로젝트 클론 후 로컬 서버 실행
2. `app.js`에서 Google Client ID 설정
3. 개발용 도메인을 Google OAuth에 등록

### API 엔드포인트

#### 사용자 관리
- `POST /api/users` - 사용자 생성/업데이트
- `GET /api/users/{id}` - 사용자 정보 조회

#### 게시글 관리
- `GET /api/posts` - 게시글 목록 조회
- `POST /api/posts` - 새 게시글 작성
- `PUT /api/posts/{id}` - 게시글 수정
- `DELETE /api/posts/{id}` - 게시글 삭제

#### 프로젝트 관리
- `GET /api/projects` - 프로젝트 목록 조회
- `POST /api/projects` - 프로젝트 업로드
- `GET /api/projects/{id}` - 프로젝트 상세 조회

#### 댓글 및 좋아요
- `POST /api/comments` - 댓글 작성
- `GET /api/comments?postId={id}` - 댓글 목록 조회
- `POST /api/likes` - 좋아요 토글

### 데이터 구조

#### 사용자 (Users)
```json
{
  "id": "google_user_id",
  "name": "사용자 이름",
  "email": "user@example.com",
  "picture": "profile_image_url",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### 게시글 (Posts)
```json
{
  "id": "post_id",
  "title": "게시글 제목",
  "content": "게시글 내용",
  "category": "question",
  "authorId": "user_id",
  "likes": 0,
  "comments": 0,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### 프로젝트 (Projects)
```json
{
  "id": "project_id",
  "name": "프로젝트 이름",
  "description": "프로젝트 설명",
  "authorId": "user_id",
  "fileName": "project.ctm",
  "fileKey": "projects/project_id/project.ctm",
  "fileSize": 1024,
  "tags": ["초급", "게임"],
  "downloads": 0,
  "likes": 0,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## 🚀 배포 방법

1. 코드를 Git 레포지토리에 푸시
2. Cloudflare Pages에서 Git 연결
3. 자동 배포 또는 수동 배포 실행
4. 도메인 설정 (선택사항)

## 📝 할 일 목록

### 현재 구현된 기능
- ✅ 기본 UI/UX 구현
- ✅ 구글 로그인 연동
- ✅ 게시판 기본 기능
- ✅ 프로젝트 업로드 기능
- ✅ 프로필 페이지
- ✅ Cloudflare Workers 백엔드

### 추가 구현 예정 기능
- 🔄 실시간 댓글 시스템
- 🔄 파일 첨부 기능 확장
- 🔄 검색 기능
- 🔄 알림 시스템
- 🔄 관리자 페이지
- 🔄 다크 테마
- 🔄 반응형 개선

## 🤝 기여하기

1. 이 레포지토리를 포크하세요
2. 새로운 브랜치를 생성하세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성하세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 문의

프로젝트에 대한 질문이나 제안이 있으시면 이슈를 생성해주세요.

---

**C-Terminal Community** - 코딩을 터미널처럼, 생각을 코드로 🚀 