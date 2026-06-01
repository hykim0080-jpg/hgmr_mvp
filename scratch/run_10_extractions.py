import time
import os
import sys

# 프로젝트의 scratch 경로를 임포트 패스에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from ai_hybrid_extractor import run_hybrid_pipeline

def run_10_times():
    print("🚀 [10회 연속 대량 배치 추출 개시]")
    print("  - 목표: 장르별 15개씩 10회 기동 (최대 450개 카드 추가 시도)")
    print("  - 특징: 3세대 gemini-3.1-flash-lite 배치 및 유니크 락 가동")
    print("==================================================")
    
    start_time = time.time()
    
    for i in range(10):
        print(f"\n🔥 [추출 루프 {i+1} / 10회 차 가동]")
        try:
            run_hybrid_pipeline(sentences_per_genre=15)
        except Exception as e:
            print(f"  ❌ [{i+1}회 차 치명적 실패] {e}")
            
        # 429 Rate Limit 분당 할당량 분산을 위해 루프 사이 5초간 가벼운 쿨다운
        print(f"  * 쿨다운 대기 중 (5초)...")
        time.sleep(5.0)
        
    end_time = time.time()
    elapsed = end_time - start_time
    print("\n==================================================")
    print("🎉 [10회 연속 대량 배치 추출 파이프라인 완벽 성료!]")
    print(f"  - 총 소요 시간: {elapsed:.2f}초")
    print("==================================================")

if __name__ == "__main__":
    run_10_times()
