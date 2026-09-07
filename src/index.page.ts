export function renderIndexPage(version: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>eng-std</title>
  <style>
    :root {
      --bg: #f4f4f8;
      --surface: #ffffff;
      --border: #dddde8;
      --accent: #6c63ff;
      --accent-hover: #5a52e8;
      --text: #1a1a2e;
      --text-muted: #6b6b85;
      --radius: 16px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: var(--bg);
      color: var(--text);
      font-family: 'Segoe UI', -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
    }
    .card {
      width: min(560px, 100%);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 40px 32px;
      box-shadow: 0 12px 40px rgba(26, 26, 46, 0.06);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #eeedff;
      display: grid;
      place-items: center;
      font-size: 22px;
    }
    h1 { font-size: 1.6rem; letter-spacing: -0.03em; }
    .brand-text { display: flex; flex-direction: column; gap: 6px; }
    .version {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 3px 9px;
      border-radius: 999px;
      background: #eeedff;
      color: var(--accent);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin: 14px 0 20px;
      padding: 6px 12px;
      border-radius: 999px;
      background: #ecfdf3;
      color: #15803d;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .status i {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #16a34a;
    }
    p {
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 28px;
    }
    .tile {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 14px 12px;
      background: #fafafc;
    }
    .tile strong {
      display: block;
      font-size: 0.92rem;
      margin-bottom: 4px;
    }
    .tile span {
      color: var(--text-muted);
      font-size: 0.8rem;
    }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 0.92rem;
      font-weight: 600;
    }
    .primary {
      background: var(--accent);
      color: #fff;
    }
    .primary:hover { background: var(--accent-hover); }
    .ghost {
      background: #fff;
      color: var(--text);
      border: 1px solid var(--border);
    }
    .download {
      background: var(--accent);
      color: #fff;
      min-width: 160px;
      flex-direction: column;
      gap: 2px;
      padding: 10px 18px;
    }
    .download:hover { background: var(--accent-hover); }
    .download small {
      font-size: 0.72rem;
      font-weight: 600;
      opacity: 0.85;
    }
    @media (max-width: 520px) {
      .grid { grid-template-columns: 1fr; }
      .card { padding: 28px 20px; }
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="brand">
      <div class="logo">📚</div>
      <div class="brand-text">
        <h1>eng-std</h1>
        <span class="version">앱 v${version}</span>
      </div>
    </div>
    <div class="status"><i></i>API 서버가 실행 중입니다</div>
    <p>영어 학습 앱 백엔드입니다. Windows 설치 파일을 받은 뒤 로그인하면 오늘의 단어, 퀴즈, AI 회화를 이어서 사용할 수 있습니다.</p>
    <div class="grid">
      <div class="tile"><strong>오늘의 단어</strong><span>상황별 어휘와 표현</span></div>
      <div class="tile"><strong>퀴즈</strong><span>학습 기록과 정답률</span></div>
      <div class="tile"><strong>AI 회화</strong><span>영어 대화 연습</span></div>
      <div class="tile"><strong>프로필</strong><span>일정 · 메모 · 활동</span></div>
    </div>
    <div class="actions">
      <a class="download" href="/download">Windows 앱 다운로드<small>v${version}</small></a>
      <a class="ghost" href="/docs">API 문서</a>
      <a class="ghost" href="/api/health">서버 상태</a>
    </div>
  </main>
</body>
</html>`;
}
