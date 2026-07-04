// 하랑이 앱 아이콘 생성 (Harang App Icon.dc.html 기반)
// iOS AppIcon + Android 적응형/레거시 아이콘 전 사이즈 PNG 생성
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const GRADIENT = `<radialGradient id="bg" cx="50%" cy="34%" r="82%">
  <stop offset="0%" stop-color="#22C77E"/>
  <stop offset="58%" stop-color="#10B981"/>
  <stop offset="100%" stop-color="#0B9C68"/>
</radialGradient>`;

const FACE = `
  <path d="M96,96 C82,70 96,58 116,72 C126,80 128,98 122,112 Z" fill="#E5E8EE" stroke="#3B4252" stroke-width="5" stroke-linejoin="round"/>
  <path d="M224,96 C238,70 224,58 204,72 C194,80 192,98 198,112 Z" fill="#E5E8EE" stroke="#3B4252" stroke-width="5" stroke-linejoin="round"/>
  <path d="M104,88 C96,74 104,68 114,76 C120,81 121,92 118,101 Z" fill="#F8B9C5"/>
  <path d="M216,88 C224,74 216,68 206,76 C200,81 199,92 202,101 Z" fill="#F8B9C5"/>
  <path d="M160,56 C230,56 260,128 260,202 C260,264 216,290 160,290 C104,290 60,264 60,202 C60,128 90,56 160,56 Z" fill="#E5E8EE" stroke="#3B4252" stroke-width="5"/>
  <ellipse cx="94" cy="118" rx="12" ry="7.5" fill="#AEB6C2" opacity="0.5" transform="rotate(-32 94 118)"/>
  <ellipse cx="226" cy="118" rx="12" ry="7.5" fill="#AEB6C2" opacity="0.5" transform="rotate(32 226 118)"/>
  <circle cx="102" cy="184" r="13" fill="#F8B9C5" opacity="0.85"/>
  <circle cx="218" cy="184" r="13" fill="#F8B9C5" opacity="0.85"/>
  <circle cx="124" cy="150" r="17" fill="#262B36"/>
  <circle cx="196" cy="150" r="17" fill="#262B36"/>
  <circle cx="118.5" cy="143.5" r="6" fill="#FFFFFF"/>
  <circle cx="190.5" cy="143.5" r="6" fill="#FFFFFF"/>
  <circle cx="129" cy="157" r="2.6" fill="#FFFFFF" opacity="0.9"/>
  <circle cx="201" cy="157" r="2.6" fill="#FFFFFF" opacity="0.9"/>
  <path d="M150,170 C154,165 166,165 170,170 C167,178 153,178 150,170 Z" fill="#3B4252"/>
  <path d="M151,184 Q160,192 169,184" fill="none" stroke="#3B4252" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M86,160 L112,164 M86,172 L112,171" stroke="#C6CDD9" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M234,160 L208,164 M234,172 L208,171" stroke="#C6CDD9" stroke-width="2.6" stroke-linecap="round"/>`;

const GLOW = `<ellipse cx="160" cy="30" rx="200" ry="120" fill="#FFFFFF" opacity="0.14"/>`;

// iOS/레거시 전체 아이콘 — 초록 배경 위 하랑이(여백 있는 균형 구성, 적응형과 통일)
// scale 0.82로 얼굴을 프레임 중앙에 배치해 브랜드 그린이 항상 보이게 함
function fullIcon(clip) {
  const defs = `<defs>${GRADIENT}${clip.def || ''}</defs>`;
  const cp = clip.attr || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
${defs}
<g ${cp}>
  <rect x="0" y="0" width="320" height="320" fill="url(#bg)"/>
  ${GLOW}
  <g transform="translate(160 160) scale(0.82) translate(-160 -174)">${FACE}</g>
</g>
</svg>`;
}

const SQUARE = { def: '', attr: '' };                                              // iOS: 정사각(불투명)
const ROUNDED = { def: '<clipPath id="c"><rect x="0" y="0" width="320" height="320" rx="72"/></clipPath>', attr: 'clip-path="url(#c)"' };
const CIRCLE  = { def: '<clipPath id="c"><circle cx="160" cy="160" r="160"/></clipPath>', attr: 'clip-path="url(#c)"' };

// Android 적응형 배경 (그라데이션만, 풀블리드)
const BG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
<defs>${GRADIENT}</defs>
<rect x="0" y="0" width="320" height="320" fill="url(#bg)"/>
${GLOW}
</svg>`;

// Android 적응형 전경 (얼굴만, 세이프존에 맞춰 축소 + 투명 배경)
const FG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320">
<g transform="translate(160 160) scale(0.82) translate(-160 -174)">${FACE}</g>
</svg>`;

async function render(svg, size, outPath, opaque) {
  let img = sharp(Buffer.from(svg), { density: 384 }).resize(size, size);
  if (opaque) img = img.flatten({ background: '#10B981' });
  await img.png().toFile(outPath);
  console.log('  ✓', path.relative(ROOT, outPath), `${size}px`);
}

(async () => {
  // ===== iOS =====
  console.log('iOS:');
  await render(fullIcon(SQUARE), 1024,
    path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), true);

  // ===== Android =====
  const densities = {
    'mdpi':    { legacy: 48,  adaptive: 108 },
    'hdpi':    { legacy: 72,  adaptive: 162 },
    'xhdpi':   { legacy: 96,  adaptive: 216 },
    'xxhdpi':  { legacy: 144, adaptive: 324 },
    'xxxhdpi': { legacy: 192, adaptive: 432 },
  };
  console.log('Android:');
  for (const [d, px] of Object.entries(densities)) {
    const dir = path.join(ROOT, `android/app/src/main/res/mipmap-${d}`);
    await render(fullIcon(ROUNDED), px.legacy, path.join(dir, 'ic_launcher.png'), false);
    await render(fullIcon(CIRCLE),  px.legacy, path.join(dir, 'ic_launcher_round.png'), false);
    await render(FG_SVG, px.adaptive, path.join(dir, 'ic_launcher_foreground.png'), false);
    await render(BG_SVG, px.adaptive, path.join(dir, 'ic_launcher_background.png'), false);
  }

  // 미리보기용 (검수)
  await render(fullIcon(SQUARE), 512, path.join(ROOT, 'scratch/preview_ios.png'), true);
  await render(fullIcon(ROUNDED), 512, path.join(ROOT, 'scratch/preview_android_legacy.png'), false);
  console.log('완료');
})();
