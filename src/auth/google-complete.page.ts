export function renderGoogleCompletePage(params: {
  ticket?: string;
  error?: string;
}): string {
  const payload = JSON.stringify({
    type: 'GOOGLE_OAUTH',
    ticket: params.ticket ?? null,
    error: params.error ?? null,
  });
  const message = params.error
    ? escapeHtml(params.error)
    : 'Google 로그인이 완료되었습니다. 이 창은 곧 닫힙니다.';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>Google 로그인</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f4f4f8;
      color: #1a1a2e;
      font-family: 'Segoe UI', sans-serif;
      text-align: center;
      padding: 24px;
    }
  </style>
</head>
<body>
  <p>${message}</p>
  <script>
    const payload = ${payload};
    if (window.opener) {
      window.opener.postMessage(payload, '*');
      window.close();
    }
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
