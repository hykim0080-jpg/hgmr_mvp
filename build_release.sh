#!/bin/zsh
# 릴리스 빌드 — Android AAB + iOS IPA
# 화면 없는 맥에서 릴레이로 돌리기 위해 전 과정을 로그로만 남긴다.
setopt pipefail
cd ~/Desktop/hgmr || exit 1
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export LANG=en_US.UTF-8
# Android Gradle Plugin은 Java 17+ 필요. 시스템 기본은 Corretto 11이라 Android Studio 번들 JBR을 쓴다.
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

VER=1.0
BUILD=${BUILD:-8}          # BUILD=7 zsh build_release.sh 처럼 덮어쓸 수 있다
LOG=~/Desktop/hgmr/_build$BUILD.log
: > "$LOG"
exec >> "$LOG" 2>&1

step() { echo ""; echo "########## $1 — $(date '+%H:%M:%S') ##########"; }
die()  { echo "!!!!! 실패: $1"; echo "STATUS=FAILED"; exit 1; }
# 서명 중에는 키체인 검색 경로를 빌드 키체인으로 한정한다(아래 참고).
# 무슨 일이 있어도 사용자 login 키체인을 검색 경로에 되돌려 놓는다.
restore_keychains() { security list-keychains -d user -s login.keychain hgmrbuild.keychain > /dev/null 2>&1; }
trap restore_keychains EXIT INT TERM

step "웹 자산 빌드"
npm run build || die "npm run build"

step "네이티브로 복사 (copy — 의존성 재해결 없이 자산만)"
npx cap copy ios     || die "cap copy ios"
npx cap copy android || die "cap copy android"

step "Android AAB"
if [ -n "$SKIP_ANDROID" ]; then
  echo "SKIP_ANDROID 지정됨 — 건너뜀"
  ls -la "dist/hgmr-$VER-$BUILD.aab"
else
  ( cd android && ./gradlew --no-daemon --console=plain bundleRelease ) || die "gradlew bundleRelease"
  cp android/app/build/outputs/bundle/release/app-release.aab "dist/hgmr-$VER-$BUILD.aab" || die "aab 복사"
  ls -la "dist/hgmr-$VER-$BUILD.aab"
fi

step "빌드 키체인 잠금 해제"
KCPASS=$(cat ios/signing/.kcpass) || die ".kcpass 읽기"
security unlock-keychain -p "$KCPASS" hgmrbuild.keychain || die "keychain unlock"
security set-keychain-settings -t 7200 -u hgmrbuild.keychain
# 이걸 빼먹으면 codesign이 보이지 않는 SecurityAgent 다이얼로그를 띄우고 그대로 멈춘다.
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KCPASS" hgmrbuild.keychain > /dev/null 2>&1
# 같은 "Apple Distribution" 인증서가 login 키체인에도 있어, 검색 경로에 login이 남아 있으면
# codesign이 그쪽 키를 골라 잠긴 키체인의 암호를 묻는다 — 화면이 없으면 보이지 않는 창에 걸려 영영 멈춘다.
# 서명이 끝날 때까지 검색 경로를 빌드 키체인 하나로 한정한다 (trap으로 반드시 복구).
security list-keychains -d user -s hgmrbuild.keychain
security find-identity -v -p codesigning

step "iOS 아카이브 (서명 없이 — SPM 리소스 번들 충돌 회피)"
ARCH=~/Desktop/hgmr/ios/export/App$BUILD.xcarchive
if [ -n "$SKIP_ARCHIVE" ] && [ -d "$ARCH" ]; then
  echo "SKIP_ARCHIVE 지정됨 — 기존 아카이브 재사용: $ARCH"
else
rm -rf "$ARCH"
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$ARCH" -skipPackagePluginValidation \
  CODE_SIGNING_ALLOWED=NO archive || die "xcodebuild archive"
fi

step "IPA 내보내기 (여기서 서명)"
OUT=~/Desktop/hgmr/ios/export/out$BUILD
rm -rf "$OUT"
xcodebuild -exportArchive -archivePath "$ARCH" \
  -exportOptionsPlist ios/export/ExportOptions.plist \
  -exportPath "$OUT" || die "xcodebuild exportArchive"
ls -la "$OUT"

step "엔타이틀먼트 검증"
IPA=$(ls "$OUT"/*.ipa | head -1)
rm -rf /tmp/ent$BUILD && mkdir -p /tmp/ent$BUILD && ( cd /tmp/ent$BUILD && unzip -q "$IPA" )
codesign -d --entitlements - --xml /tmp/ent$BUILD/Payload/App.app 2>/dev/null > /tmp/ent$BUILD/ent.plist
plutil -p /tmp/ent$BUILD/ent.plist
if plutil -p /tmp/ent$BUILD/ent.plist | grep -q "com.apple.developer.applesignin"; then
  echo "OK: applesignin 엔타이틀먼트 있음"
else
  echo "!!!!! applesignin 엔타이틀먼트 누락 — 재서명 필요"
  echo "STATUS=NEEDS_RESIGN"
  exit 2
fi

step "버전 확인"
plutil -p /tmp/ent$BUILD/Payload/App.app/Info.plist | grep -E "CFBundleVersion|CFBundleShortVersionString|CFBundleIdentifier"

cp "$IPA" "dist/hgmr-$VER-$BUILD.ipa"
ls -la "dist/hgmr-$VER-$BUILD.ipa"

step "완료"
echo "STATUS=OK"
