# App Store 제출 체크리스트

> 작성: 2026-07-30 · 기준: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Upcoming requirements](https://www.developer.apple.com/news/upcoming-requirements/)
> 제출 문구는 `AppStore_메타데이터.md`, 진행 상태는 `docs/진행_현황.md`

---

## 0. 한눈에

| # | 항목 | 상태 | 누가 |
|---|---|---|---|
| 1 | Xcode 26 / iOS 26 SDK로 빌드 | ⬜ **확인 필요** | 현기님 |
| 2 | **Sign in with Apple 구현** | 🔴 **미구현 — 최대 리스크** | Code |
| 3 | Apple Developer 계정 유효 | ⬜ 확인 필요 | 현기님 |
| 4 | 연령 등급 설문 재응답 | ⬜ | 현기님 |
| 5 | 스크린샷 7종 | ⬜ (합성 툴 준비됨) | 현기님 |
| — | 회원 탈퇴 · 암호화 신고 · 방침/약관 URL · 번들 ID | ✅ 완료 | — |

---

## 1. Xcode 26 / iOS 26 SDK

**2026년 4월 28일부터 의무**입니다. 이미 지난 기한이라 구버전 빌드는 업로드 단계에서 거부됩니다.

```bash
xcodebuild -version          # Xcode 26.x 이상이어야 함
xcrun --sdk iphoneos --show-sdk-version   # 26.x 이상
```

- 미달이면 App Store에서 Xcode 업데이트 (수 GB, 시간 확보 필요)
- 업데이트 후 `npx cap sync ios` 한 번 돌리고 클린 빌드
- 현재 프로젝트의 `IPHONEOS_DEPLOYMENT_TARGET = 15.0` 은 그대로 둬도 됩니다. **빌드 SDK 버전과 최소 지원 버전은 별개입니다**

---

## 2. Sign in with Apple — 이것이 제출을 막는 진짜 요건

### 왜 필요한가

가이드라인 4.8은, 서드파티·소셜 로그인으로 **주 계정을 설정·인증하는 앱**은 아래를 만족하는 **동등한 로그인 수단을 함께 제공**하도록 합니다.

> ① 이름과 이메일만 수집 ② 이메일 비공개 설정 가능 ③ 동의 없이 광고 목적으로 앱 내 활동 수집하지 않음

면제 조건은 **"앱이 오직 자체 계정 시스템만 사용하는 경우"**입니다. 한글마루는 이메일/비밀번호(자체) **더하기** 구글 로그인을 제공하므로 면제되지 않습니다. 이메일 로그인이 있으니 괜찮을 것 같지만, 규정 문구는 '오직(exclusively)'입니다.

Google Sign-In은 위 세 조건을 만족하지 못해 동등 수단이 될 수 없습니다. → **Sign in with Apple 필요.**

### 확인된 현재 상태

| 항목 | 상태 |
|---|---|
| `ios/App/App/*.entitlements` | ❌ 없음 |
| `capacitor.config.json` providers | `["google.com"]` — apple 없음 |
| `index.html` 내 Apple 로그인 | 0건 |
| `@capacitor-firebase/authentication` | **8.3.0 — Apple 공급자 지원함** |

플러그인이 이미 지원하므로 처음부터 만들 필요는 없습니다.

### 구현 범위 (Code 요청으로 이관됨)

1. Apple Developer → Identifiers에서 `com.hgmr.app`에 **Sign in with Apple** capability 활성화
2. Xcode → Signing & Capabilities → **Sign in with Apple** 추가 (`App.entitlements` 생성됨)
3. Firebase 콘솔 → Authentication → **Apple 공급자 사용 설정**
4. `capacitor.config.json` → `providers: ["google.com", "apple.com"]`
5. **웰컴 화면**에 Apple 로그인 버튼 추가 — Apple의 [버튼 디자인 규격](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple) 준수 (검정/흰색, 모서리 반경, 문구 "Apple로 계속하기")
6. 네이티브는 플러그인 `signInWithApple()` → `idToken`·`rawNonce`를 JS SDK `OAuthProvider('apple.com')`에 전달. 웹은 `signInWithPopup`

### 구현 시 주의 — 실제로 자주 걸리는 것들

- **이메일 비공개(private relay) 계정 처리**: `@privaterelay.appleid.com` 주소가 옵니다. 정상 계정으로 취급해야 하며, 이메일로 사용자를 식별하는 로직이 있다면 uid 기준으로 바꿔야 합니다
- **이름은 최초 1회만 옵니다.** 두 번째 로그인부터 `displayName`이 비어 옵니다. 첫 로그인 때 Firestore에 저장해 두지 않으면 영영 못 받습니다
- **버튼 위치**: 다른 소셜 로그인 버튼과 **동등하게 눈에 띄는 위치**여야 합니다. 구글 아래 작게 넣으면 4.8 위반으로 볼 수 있습니다
- **회원 탈퇴 시 토큰 폐기**: 이미 구현된 탈퇴 로직에 Apple 토큰 revoke를 추가하는 편이 안전합니다

---

## 3. Apple Developer 계정

- **연 $99 멤버십이 유효한지** 확인. 만료되면 심사 중인 앱도 멈추고, 게시된 앱은 내려갑니다
- 프로젝트에 팀 ID `8R75GVTDJ4` 가 박혀 있으니 가입은 되어 있습니다. **갱신일만 보세요**
- App Store Connect → 앱 추가 → 번들 ID `com.hgmr.app` 선택 (2번 작업으로 Identifier가 갱신된 뒤에 하는 편이 깔끔합니다)

---

## 4. 연령 등급 설문 — 그대로 답하시면 됩니다

Apple이 등급 체계를 개편했고 **2026년 1월 31일까지 갱신 응답**을 요구했습니다. 미응답이면 제출이 막힙니다.

한글마루 기준 응답안입니다.

| 질문 항목 | 답 |
|---|---|
| 폭력 (만화/판타지·사실적) | 없음 |
| 성적 콘텐츠·노출 | 없음 |
| 욕설·저속한 유머 | 없음 |
| 알코올·담배·약물 | 없음 |
| 공포·소름 끼치는 내용 | 없음 |
| 도박 (시뮬레이션 포함) | 없음 |
| 의료·치료 정보 | 없음 |
| 사용자 간 무제한 웹 접근 | 없음 |
| 위치 공유 | 없음 |
| **사용자 생성 콘텐츠 노출** | **아래 5절 참고 — 판단 필요** |
| 인앱 구매 | 없음 |
| 광고 | 없음 |

→ 예상 등급 **4+** (`AppStore_메타데이터.md` 기재값과 일치)

---

## 5. ⚠️ 사용자 생성 콘텐츠 — 검토가 필요한 회색지대

**오답 통계 패널**은 다른 이용자가 입력한 답을 상위 5개까지 그대로 보여줍니다.

확인한 사실:

- ✅ **XSS는 없습니다** — `escapeHTML()`로 이스케이프한 뒤 삽입합니다
- ⚠️ 그러나 `sanitizeStatKey()`는 **30자 자르기와 Firestore 금지문자 제거만** 합니다. 욕설 필터가 없습니다
- ⚠️ 즉 이용자가 비속어를 입력하면 **다른 이용자 화면에 노출될 수 있습니다**
- ⚠️ 기존 🚩 신고 버튼은 **단어 데이터 오류 신고**이지, 남의 답을 신고하는 수단이 아닙니다

가이드라인 1.2는 사용자 생성 콘텐츠가 있는 앱에 **필터링·신고·차단·연락처**를 요구합니다. 통계 집계 화면이 여기에 해당하는지는 해석의 여지가 있어 반드시 거부된다고 볼 수는 없지만, 심사자가 비속어를 목격하면 지적될 수 있습니다.

### 권한 최소 비용의 해법 (제안)

**표시 대상을 화이트리스트로 제한**하면 임의 문자열이 화면에 뜰 여지가 사라집니다.

> 통계 패널에 노출하는 답을 **① 정답 ② `accepts`의 유의어 ③ `words.json`에 표제어로 존재하는 단어** 로만 한정하고, 나머지는 합산해 **「기타 N%」** 한 줄로 묶는다.

- 기능의 값어치(“남들은 뭐라고 썼을까”)는 그대로 유지됩니다
- 욕설 사전을 관리할 필요가 없습니다
- 연령 등급 설문에서 UGC를 **'없음'**으로 답할 근거가 생깁니다

→ Code에 🟠 제안으로 전달했습니다. **제출 전 처리를 권합니다.**

---

## 6. 스크린샷

- 필수: **6.9인치 1320×2868** 한 세트 (Apple이 다른 크기로 자동 축소)
- 목록·캡션 7종은 `AppStore_메타데이터.md`에 준비됨
- 합성은 **`hgmr-screenshot-tool.html`** 사용 — 촬영본을 넣으면 캡션·배경을 입혀 규격대로 내보냅니다
- 촬영: 시뮬레이터 `Cmd+S`, 상태바 9:41
- ⚠️ **캡션에 앱에 없는 기능을 적으면 거부 사유**입니다. 문구를 바꾸실 때 확인하세요

---

## 7. App Privacy (개인정보 영양표)

Firebase Analytics를 붙였으므로 **이전에 신고한 것보다 항목이 늘었습니다.**

| 데이터 | 목적 | 사용자와 연결 | 추적 |
|---|---|---|---|
| 이메일 주소 | 앱 기능, 계정 관리 | 예 | 아니요 |
| 이름 | 앱 기능 | 예 | 아니요 |
| 사용자 ID | 앱 기능, 계정 관리 | 예 | 아니요 |
| 기타 사용자 콘텐츠 (닉네임·신고 내용) | 앱 기능 | 예 | 아니요 |
| **제품 상호작용** | **분석** | 예 | 아니요 |
| **기타 사용 데이터** | **분석** | 예 | 아니요 |
| **기기 ID** | **분석** | 예 | 아니요 |
| 진단 (크래시·성능) | 분석 | 아니요 | 아니요 |

- **'추적'은 전부 '아니요'** — 광고 식별자를 쓰지 않고 타사와 데이터를 결합하지 않습니다. 따라서 ATT 권한 요청도 불필요합니다
- 개인정보처리방침(`hgmr.co.kr/privacy.html`)에 이 항목들이 이미 반영돼 있습니다. **영양표와 방침이 어긋나면 거부 사유**이므로 둘을 대조하세요

---

## 8. 제출 직전 마지막 확인

- [ ] `npm run build && firebase deploy --only hosting` — 웹과 앱 번들 동기화
- [ ] `npx cap sync ios`
- [ ] Xcode → Product → Archive → Distribute → App Store Connect
- [ ] 빌드 번호(`CURRENT_PROJECT_VERSION`)를 올렸는지 — 같은 번호는 재업로드 불가
- [ ] TestFlight에서 **실기기로 한 번 통과 플레이** (로그인 3종 · 배치고사 · 세션 완료 · 탈퇴)
- [ ] 심사 제출 시 Review Notes 입력 (아래)

### Review Notes (그대로 붙여넣기)

```
This app supports anonymous sign-in — no account is required for review.
Tap "로그인 없이 둘러보기" (Browse without login) on the welcome screen to access all features immediately.

Account deletion is available in-app: profile chip (top right) → scroll to bottom → 회원 탈퇴.

The app is a Korean vocabulary learning quiz. All content is educational and curated by the developer.
```

### 심사 결과 대응

- 거부 사유는 **Resolution Center**에 옵니다. 대부분 문구 수정이나 설정 하나로 끝납니다
- **4.8(로그인) 거부가 나오면** Sign in with Apple 미구현이 원인입니다. 2절 참고
- 첫 심사는 보통 24~48시간, 길면 일주일

---

## 9. 이 문서가 다루지 않는 것

- Play 스토어 → `docs/PlayStore_등록문.md` (⚠️ 개인 개발자 계정이면 **테스터 20명 × 12일** 요건이 별도로 있습니다)
- 스토어 문구 원본 → `AppStore_메타데이터.md`
- 전체 진행 상황 → `docs/진행_현황.md`
