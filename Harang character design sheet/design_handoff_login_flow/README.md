# Handoff: Hangul Maru — Login Flow (하랑이 로그인 플로우)

## Overview
Login flow for **Hangul Maru**, a Korean vocabulary learning app whose mascot is **Harang (하랑이)**, a baby harp seal. The flow has two screens:

1. **Welcome / Home** — mascot-hero screen (mint background, big Harang illustration, speech bubble, entry buttons)
2. **Email Login** — restrained product-tone screen (white, email + password form)

Tapping **“이메일로 시작하기”** on Welcome navigates to Email Login. The Email Login screen has a **‹ back** button returning to Welcome. Both screens also offer **Google login** and a **guest entry** (“로그인 없이 둘러보기”).

## About the Design Files
The files in this bundle are **design references created in HTML** — interactive prototypes showing intended look and behavior, **not production code**. The task is to **recreate these designs in the target codebase’s existing environment** (React Native, SwiftUI, Flutter, web, etc.) using its established patterns and libraries. If no environment exists yet, choose the most appropriate mobile framework and implement the designs there.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and copy are final. Recreate pixel-perfectly (values below), adapting only platform conventions (safe areas, native inputs, keyboard avoidance).

## Screens / Views

### Screen 1 — Welcome / Home (`isHome`)
- **Purpose**: first screen after launch; choose an entry method.
- **Layout**: full-screen vertical flex, horizontally centered, background `#ECFDF5`. Padding: 24px sides, 28px bottom (plus safe areas). Content vertically centered by flexible spacers above and below the mascot group; button stack pinned near the bottom.
- **Components** (top → bottom):
  - **Speech bubble**: white bg, border `2.5px solid #3B4252`, radius 18px, padding 12×20px, hard offset shadow `3px 3px 0 #3B4252`, centered 18px tail (rotated square) at bottom. Text: “안녕! 오늘도 같이 배워볼까?” — font **Jua** 20px, color `#2A2F3A`.
  - **Harang illustration**: 216×216px, 18px below the bubble. Use `assets/harang-default.svg` (sitting pose, emerald scarf, outlined style — outline `#3B4252` @ 5/320 viewBox units).
  - **Wordmark**: “한글마루” — Jua 34px, `#2A2F3A`, 10px below the mascot.
  - **Button stack** (full width, 12px gap):
    1. **Primary**: “이메일로 시작하기” — h 56px, radius 18px, bg `#10B981`, border `2.5px solid #3B4252`, shadow `3px 3px 0 #3B4252`, Jua 19px white. **Pressed state**: translate(2px,2px), shadow `1px 1px 0 #3B4252`.
    2. **Google**: “Google로 계속하기” — same shape, white bg, text `#2A2F3A`; leading 24px circle (`#F3F4F6`) with “G” (`#4285F4`, 700 15px). Replace with the official Google sign-in asset in production.
    3. **Guest**: “로그인 없이 둘러보기” — text button, h 44px, Noto Sans KR 15px/500, `#6B7280`, underline (offset 3px).

### Screen 2 — Email Login (`isEmail`)
- **Purpose**: email/password sign-in.
- **Layout**: full-screen vertical flex, white bg, padding 68px top (clears status bar) / 28px sides & bottom. Guest button pinned to bottom by a flexible spacer.
- **Components** (top → bottom):
  - **Header row** (flex, 8px gap): back button “‹” 36×36px (24px glyph, `#2A2F3A`, −10px left margin) · shard logo 26px (`assets/wisdom-shard.svg`) · “한글마루” Noto Sans KR 17px/900 `#2A2F3A`.
  - **Greeting** (36px below header, row, space-between, bottom-aligned): H1 “다시 만나서\n반가워요” Noto Sans KR 26px/900, line-height 1.35, `#1F242E`; sub “하랑이가 기다리고 있었어요” 14px `#7A8494`. Right: Harang illustration 88×88px.
  - **Form** (32px below, 12px gap): inputs “이메일” / “비밀번호(password)” — h 52px, radius 14px, border `1.5px solid #E5E7EB`, bg `#F9FAFB`, padding 0 16px, 15px text `#2A2F3A`. Submit **“로그인”** — h 54px, radius 14px, bg `#10B981`, white 16px/700, 4px extra top margin.
  - **Divider**: “또는” 12px `#9AA3B2` between 1px `#E5E7EB` lines, 22px vertical margins.
  - **Google button**: h 54px, radius 14px, white, border `1.5px solid #E5E7EB`, 15px/500 `#2A2F3A`, leading 22px “G” circle (as above).
  - **Guest**: bottom-pinned text button “로그인 없이 둘러보기 →” 14px `#7A8494`.

## Interactions & Behavior
- Welcome → tap “이메일로 시작하기” → Email Login.
- Email Login → tap “‹” → Welcome.
- **Screen-enter transition**: 280ms ease; fade in + translateX from 28px → 0 (`screenIn` keyframes in the prototype). Apply on each screen mount (both directions).
- Google / 로그인 / guest buttons are visual stubs in the prototype — wire to real auth (Google OAuth, email auth, anonymous session) in production.
- Form validation (suggested, not in prototype): disable 로그인 until both fields are non-empty; standard email format check.
- Keyboard: inputs must scroll/avoid the keyboard per platform convention.

## State Management
- `screen: 'home' | 'email'` — single navigation state (prototype uses component state; use your router/navigator).
- Auth state (loading / error) to be added per codebase patterns.

## Design Tokens
**Colors**
- Brand emerald `#10B981` · crystal `#34D399` · facet `#6EE7B7` · dark emerald (accents) `#059669`
- Mint screen bg `#ECFDF5`
- Ink / outline `#3B4252` · heading `#1F242E` / `#2A2F3A` · secondary `#7A8494` · muted `#9AA3B2` / `#6B7280`
- Borders `#E5E7EB` · input bg `#F9FAFB`
- Mascot: body `#E5E8EE`, belly `#DFE3E9`, spots `#AEB6C2`, flippers `#DCE0E8`, blush `#F8B9C5`, eyes `#262B36`
**Typography**
- Display/cute: **Jua** (Google Fonts) — bubble 20px, wordmark 34px, chunky buttons 19px
- UI: **Noto Sans KR** — H1 26/900, body 14–15/400–500, button 16/700
**Radii**: chunky buttons/bubble 18px · inputs & flat buttons 14px
**Shadows**: hard offset `3px 3px 0 #3B4252` (cute tone only; no blur)
**Spacing**: screen padding 24–28px; stack gap 12px; section gaps 32–44px

## Assets
- `assets/harang-default.svg` — Harang, default sitting pose (outlined style), source of truth for the mascot on both screens
- `assets/wisdom-shard.svg` — emerald shard logo with “ㅎ” (the ㅎ is live SVG text; convert to a path if font loading is a concern)
- Full character reference (4 poses, palette, scale test): `Harang Character Sheet.dc.html`
- Google “G”: placeholder — use official branded asset in production
- `screenshots/01-welcome-home.png`, `screenshots/02-email-login.png` — the two flow screens (captured from the canvas doc; the implement-me flow is the top device frame). `screenshots/character-sheet.png` — full mascot reference sheet.

## Files
- `Login Explorations.dc.html` — the design document. **Turn 2 / option `2a` (top section) is the flow to implement**; turn 1 (`1a`–`1c`) are earlier static explorations kept for reference (`1c` is an unused alternate direction). Open in a browser; the interactive logic (screen state + handlers) is in the `<script data-dc-script>` block at the bottom.
- `ios-frame.jsx` — iPhone device frame used purely for presentation; not part of the design.
- `Harang Character Sheet.dc.html` — mascot reference sheet.
