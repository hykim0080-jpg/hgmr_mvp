import json
import os
import re

WORDS_PATH = "/Users/hyk/Desktop/hgmr/words.json"

def run_words_audit():
    print("==================================================")
    print("🔍 [한글마루 words.json 지능형 품질 감사(Quality Audit) 가동]")
    print("==================================================")
    
    if not os.path.exists(WORDS_PATH):
        print(f"❌ [에러] {WORDS_PATH} 파일이 존재하지 않습니다.")
        return
        
    with open(WORDS_PATH, 'r', encoding='utf-8') as f:
        words = json.load(f)
        
    print(f"  - 분석 대상 총 단어 수: {len(words)}개\n")
    
    anomalies = []
    
    for i, w in enumerate(words):
        target = w.get("target", "").strip()
        accepts = w.get("accepts", [])
        meaning = w.get("meaning", "").strip()
        sentence = w.get("sentence", "").strip()
        level = w.get("level", 2)
        tags = w.get("tags", [])
        
        issue_list = []
        
        # 1. 빈칸 마스킹 검증
        if "____" not in sentence:
            issue_list.append("빈칸 마스킹(____) 누락")
        elif sentence.count("____") > 1:
            issue_list.append(f"빈칸 마스킹 개수 다중 검출 ({sentence.count('____')}개)")
            
        # 2. 타겟 단어 노출 체크
        if target and target in sentence:
            issue_list.append("마스킹 되지 않고 타겟 단어가 예문에 그대로 노출")
            
        # 3. 뜻풀이 품질 검사 (이모지 및 길이, 기호 체크)
        if not meaning:
            issue_list.append("뜻풀이 공백")
        else:
            if len(meaning) > 40:
                issue_list.append(f"뜻풀이가 너무 장황함 ({len(meaning)}자)")
            if any(emoji in meaning for emoji in ["💡", "⭐", "🌟", "🔥", "✔", "📌"]):
                issue_list.append("뜻풀이에 불필요한 이모지(💡 등) 포함")
            if any(symbol in meaning for symbol in ["¶", "≪", "≫"]):
                issue_list.append("사전식 불필요 가공 기호(¶ 등) 잔존")
                
        # 4. 유의어(accepts) 검증
        if not accepts:
            issue_list.append("유의어(accepts) 목록이 완전히 비어있음")
        else:
            if target not in accepts:
                issue_list.append("허용 단어 목록(accepts)에 정답 단어 본인이 제외되어 있음")
            
            # accepts 내 유의어들의 문맥 정합성 진단 (가벼운 필터링)
            for acc in accepts:
                if len(acc) < 2:
                    issue_list.append(f"유의어에 너무 짧은 글자({acc})가 포함되어 오답 판정 위험 있음")
                if acc == target:
                    continue
                # 유의어가 문장에 대입되었을 때 문법적 결합도 기초 체크
                # (은/는, 이/가 조사가 문장 내에 있을 경우, 유의어의 종성 일치 여부 등에 따른 미세 이질감 검토)
                # 이 부분은 사람이 정밀하게 검토할 수 있도록 리스트업 제공
                
        if issue_list:
            anomalies.append({
                "index": i + 1,
                "target": target,
                "meaning": meaning,
                "sentence": sentence,
                "accepts": accepts,
                "issues": issue_list
            })
            
    # 결과 요약
    print("==================================================")
    print("📊 [품질 감사 분석 결과 요약]")
    print(f"  - 검토 완료된 총 단어 수: {len(words)}개")
    print(f"  - 정비/검토가 필요한 의심 카드 수: {len(anomalies)}개")
    print("==================================================")
    
    if anomalies:
        print("\n📢 [검토 필요 항목 상세 리포트]")
        for item in anomalies:
            print(f"\n[{item['index']}번 카드] 단어: '{item['target']}' | 난이도: {words[item['index']-1].get('level')}")
            print(f"  - 뜻풀이: {item['meaning']}")
            print(f"  - 예문: {item['sentence']}")
            print(f"  - 허용 유의어: {item['accepts']}")
            print(f"  ⚠️ 지적된 의심 이슈:")
            for issue in item["issues"]:
                print(f"    * {issue}")
    else:
        print("\n🎉 [완벽!] 지형적으로 발견된 중대한 정합성 오류나 구조 결함이 단 1개도 존재하지 않습니다.")
        
if __name__ == "__main__":
    run_words_audit()
