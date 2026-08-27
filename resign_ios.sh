#!/bin/zsh
# 내보낸 IPA 재서명 — Apple 로그인 엔타이틀먼트 복원
#
# 아카이브를 CODE_SIGNING_ALLOWED=NO로 만들기 때문에(SPM 리소스 번들이 프로비저닝
# 프로파일을 못 받는 문제 회피) exportArchive가 프로파일 기본값으로만 서명한다.
# 그 결과 App.entitlements의 com.apple.developer.applesignin이 빠진다 → 여기서 복원.
setopt pipefail
cd ~/Desktop/hgmr || exit 1
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer

VER=1.0; BUILD=${BUILD:-7}
ID=19601AE691A4417E59B89F7C0AE5C8CF8A06578C
SRC=~/Desktop/hgmr/ios/export/out$BUILD/App.ipa
WORK=/tmp/resign$BUILD
OUT=~/Desktop/hgmr/dist/hgmr-$VER-$BUILD.ipa
LOG=~/Desktop/hgmr/_resign$BUILD.log
: > "$LOG"; exec >> "$LOG" 2>&1

die() { echo "!!!!! 실패: $1"; echo "STATUS=FAILED"; exit 1; }
restore_keychains() { security list-keychains -d user -s login.keychain hgmrbuild.keychain > /dev/null 2>&1; }
trap restore_keychains EXIT INT TERM

KCPASS=$(cat ios/signing/.kcpass) || die ".kcpass"
security list-keychains -d user -s hgmrbuild.keychain
security unlock-keychain -p "$KCPASS" hgmrbuild.keychain || die "unlock"
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KCPASS" hgmrbuild.keychain > /dev/null 2>&1

echo "## IPA 펼치기"
rm -rf "$WORK" && mkdir -p "$WORK" && ( cd "$WORK" && unzip -q "$SRC" ) || die "unzip"
echo "IPA 최상위 구성: $(ls "$WORK" | tr '\n' ' ')"

cat > /tmp/ent$BUILD.plist <<'PL'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>application-identifier</key><string>8R75GVTDJ4.com.hgmr.app</string>
  <key>beta-reports-active</key><true/>
  <key>com.apple.developer.applesignin</key><array><string>Default</string></array>
  <key>com.apple.developer.team-identifier</key><string>8R75GVTDJ4</string>
  <key>get-task-allow</key><false/>
</dict>
</plist>
PL

echo "## 앱 번들 재서명"
codesign --force --sign "$ID" --entitlements /tmp/ent$BUILD.plist \
  --generate-entitlement-der --timestamp=none \
  "$WORK/Payload/App.app" || die "codesign"

echo "## 검증"
codesign --verify --strict --verbose=2 "$WORK/Payload/App.app" || die "codesign --verify"
codesign -d --entitlements - --xml "$WORK/Payload/App.app" 2>/dev/null > /tmp/ent$BUILD.out
plutil -p /tmp/ent$BUILD.out
plutil -p /tmp/ent$BUILD.out | grep -q "applesignin" || die "applesignin 여전히 없음"

echo "## 다시 압축 (Payload 외 최상위 항목도 모두 포함)"
rm -f "$OUT"
( cd "$WORK" && zip -qry "$OUT" . ) || die "zip"
ls -la "$OUT"

echo "## 최종 확인"
rm -rf /tmp/verify4 && mkdir -p /tmp/verify4 && ( cd /tmp/verify4 && unzip -q "$OUT" )
plutil -p /tmp/verify4/Payload/App.app/Info.plist | grep -E "CFBundleVersion|CFBundleShortVersionString|CFBundleIdentifier"
codesign -d --entitlements - --xml /tmp/verify4/Payload/App.app 2>/dev/null | plutil -p - | grep applesignin
echo "STATUS=OK"
