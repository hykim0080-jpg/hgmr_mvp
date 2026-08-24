// 📸 스토어 스크린샷 전용 페이지 생성 — www/shot.html
//
// index.html에 "홈 화면에 추가 시 전체화면(standalone) 실행" 메타만 주입한 사본이다.
// 본 사이트(index.html)에는 넣지 않는다: iOS standalone에서는 window.open이 Safari로
// 빠져나가 signInWithPopup 기반 구글·애플 로그인이 실패하기 때문. 촬영 페이지에서는
// 「로그인 없이 둘러보기」(signInAnonymously)로 진입하므로 문제되지 않는다.
const fs = require('fs');

const anchor = '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#121212">';
const src = fs.readFileSync('index.html', 'utf8');

if (!src.includes(anchor)) {
    console.error('make_shot: theme-color 앵커를 찾지 못했습니다. index.html <head>를 확인하세요.');
    process.exit(1);
}

const injected = anchor + `
    <!-- 촬영 전용: 브라우저 UI 없이 전체화면으로 실행 -->
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="한글마루">`;

fs.mkdirSync('www', { recursive: true });
fs.writeFileSync('www/shot.html', src.replace(anchor, injected));
console.log('make_shot: www/shot.html 생성 완료');
