#!/bin/zsh

# 에러 발생 시 즉시 중단
set -e

echo "=== [1단계] 새로운 100개 고급 단어 병합 및 가나다 정렬 시작 ==="
python3 /Users/hyk/.gemini/antigravity/brain/5a0382e6-cf91-4a37-8eee-2a5ac57148bd/scratch/merge_words_3.py

echo "=== [2단계] Web Asset 컴파일 및 Production 빌드 시작 ==="
npm run build

echo "=== [3단계] Capacitor 모바일 플랫폼 동기화 시작 ==="
npx cap sync

echo "=== 모든 단어 확장 및 동기화 작업이 완벽하게 완료되었습니다! ==="
