import Foundation

/// 두벌식 자모 입력 → 한글 음절 조합 오토마타
/// 초성 19 · 중성 21 · 종성 28, 겹모음·겹받침 결합/분해 지원
struct HangulComposer {
    static let choseong = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]
    static let jungseong = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"]
    static let jongseong = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"]

    /// 겹모음 결합: (기존 중성, 새 모음) → 겹모음
    static let vowelCombos: [String: String] = [
        "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ",
        "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ",
        "ㅡㅣ": "ㅢ",
    ]

    /// 겹받침 결합
    static let finalCombos: [String: String] = [
        "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ",
        "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ",
        "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ",
    ]

    /// 겹받침 분해 (역방향)
    static let finalSplits: [String: (String, String)] = [
        "ㄳ": ("ㄱ", "ㅅ"), "ㄵ": ("ㄴ", "ㅈ"), "ㄶ": ("ㄴ", "ㅎ"),
        "ㄺ": ("ㄹ", "ㄱ"), "ㄻ": ("ㄹ", "ㅁ"), "ㄼ": ("ㄹ", "ㅂ"),
        "ㄽ": ("ㄹ", "ㅅ"), "ㄾ": ("ㄹ", "ㅌ"), "ㄿ": ("ㄹ", "ㅍ"),
        "ㅀ": ("ㄹ", "ㅎ"), "ㅄ": ("ㅂ", "ㅅ"),
    ]

    static let vowelSplits: [String: (String, String)] = [
        "ㅘ": ("ㅗ", "ㅏ"), "ㅙ": ("ㅗ", "ㅐ"), "ㅚ": ("ㅗ", "ㅣ"),
        "ㅝ": ("ㅜ", "ㅓ"), "ㅞ": ("ㅜ", "ㅔ"), "ㅟ": ("ㅜ", "ㅣ"),
        "ㅢ": ("ㅡ", "ㅣ"),
    ]

    static func isVowel(_ j: String) -> Bool { jungseong.contains(j) }
    static func isConsonant(_ j: String) -> Bool { choseong.contains(j) }

    static func compose(cho: String, jung: String, jong: String) -> String? {
        guard let ci = choseong.firstIndex(of: cho),
              let ji = jungseong.firstIndex(of: jung),
              let ti = jongseong.firstIndex(of: jong) else { return nil }
        let code = 0xAC00 + (ci * 21 + ji) * 28 + ti
        return String(UnicodeScalar(code)!)
    }

    /// 완성형 음절 → (초, 중, 종) 분해. 음절이 아니면 nil.
    static func decompose(_ ch: Character) -> (cho: String, jung: String, jong: String)? {
        guard let scalar = ch.unicodeScalars.first?.value,
              scalar >= 0xAC00, scalar <= 0xD7A3 else { return nil }
        let idx = Int(scalar) - 0xAC00
        let ci = idx / (21 * 28)
        let ji = (idx % (21 * 28)) / 28
        let ti = idx % 28
        return (choseong[ci], jungseong[ji], jongseong[ti])
    }

    // MARK: - 입력 처리

    /// 현재 텍스트에 자모 하나를 입력한 결과를 반환
    static func input(_ jamo: String, into text: String) -> String {
        guard !text.isEmpty, let last = text.last else {
            return text + jamo
        }
        var head = String(text.dropLast())

        if isVowel(jamo) {
            // 마지막이 단독 자음이면 → 음절 시작
            if isConsonant(String(last)) {
                if let s = compose(cho: String(last), jung: jamo, jong: "") {
                    return head + s
                }
                return text + jamo
            }
            if let (cho, jung, jong) = decompose(last) {
                if jong.isEmpty {
                    // 겹모음 시도
                    if let combined = vowelCombos[jung + jamo],
                       let s = compose(cho: cho, jung: combined, jong: "") {
                        return head + s
                    }
                    return text + jamo
                }
                // 받침 있는 음절 + 모음 → 받침 이동 (겹받침이면 분해)
                if let (keep, move) = finalSplits[jong] {
                    if let s1 = compose(cho: cho, jung: jung, jong: keep),
                       let s2 = compose(cho: move, jung: jamo, jong: "") {
                        return head + s1 + s2
                    }
                } else if choseong.contains(jong),
                          let s1 = compose(cho: cho, jung: jung, jong: ""),
                          let s2 = compose(cho: jong, jung: jamo, jong: "") {
                    return head + s1 + s2
                }
            }
            return text + jamo
        }

        // 자음 입력
        if let (cho, jung, jong) = decompose(last) {
            if jong.isEmpty {
                // 종성으로 붙이기 (종성 가능 자음만)
                if jongseong.contains(jamo), let s = compose(cho: cho, jung: jung, jong: jamo) {
                    return head + s
                }
                return text + jamo
            }
            // 겹받침 시도
            if let combined = finalCombos[jong + jamo],
               let s = compose(cho: cho, jung: jung, jong: combined) {
                return head + s
            }
            return text + jamo
        }
        // 마지막이 자음/기타 → 그냥 덧붙임
        _ = head
        return text + jamo
    }

    /// 백스페이스: 음절을 자모 단위로 되감기
    static func backspace(_ text: String) -> String {
        guard let last = text.last else { return text }
        let head = String(text.dropLast())

        guard let (cho, jung, jong) = decompose(last) else {
            return head   // 자모·일반 문자는 통째로 삭제
        }
        if !jong.isEmpty {
            // 겹받침 → 홑받침
            if let (keep, _) = finalSplits[jong], let s = compose(cho: cho, jung: jung, jong: keep) {
                return head + s
            }
            if let s = compose(cho: cho, jung: jung, jong: "") {
                return head + s
            }
        }
        // 겹모음 → 홑모음
        if let (baseVowel, _) = vowelSplits[jung], let s = compose(cho: cho, jung: baseVowel, jong: "") {
            return head + s
        }
        // 초성만 남기기
        return head + cho
    }
}
