import Foundation

/// 어휘 고도 — Elo 기반 간이 IRT (웹앱 수식 그대로)
enum VocabEngine {
    static let ratingMin: Double = 800
    static let ratingMax: Double = 1900
    static let srsIntervals = [1, 3, 7, 14, 30]

    /// 문제 난이도 b
    static func wordDifficulty(_ w: Word, itemDelta: Double = 0) -> Double {
        var b: Double
        if w.tags.contains("기초") {
            b = 1000
        } else if w.level == 3 {
            b = 1650
        } else if w.level == 2 {
            b = 1450
        } else {
            b = 1250
        }
        let lenAdj = (Double(w.sentence.count) - 39) * 1.5
        b += min(60, max(-60, lenAdj))
        b -= 15 * Double(min(4, w.accepts.filter { $0 != w.target }.count))
        if w.tags.contains(where: { ["학술_논리", "감정_심리", "격식_비즈니스"].contains($0) }) {
            b += 30
        }
        b += itemDelta
        return min(1800, max(900, b))
    }

    static func expectedP(_ theta: Double, _ b: Double) -> Double {
        1 / (1 + pow(10, (b - theta) / 400))
    }

    static func userK(_ n: Int) -> Double {
        n < 30 ? 32 : (n < 100 ? 16 : 8)
    }

    static func clampRating(_ r: Double) -> Double {
        min(ratingMax, max(ratingMin, r))
    }

    static func tier(_ r: Double) -> String {
        if r >= 1700 { return "마루" }
        if r >= 1500 { return "능선" }
        if r >= 1300 { return "중턱" }
        if r >= 1100 { return "오르막" }
        return "기슭"
    }

    /// 표시용 고도(m)
    static func altitude(peak: Double) -> Int {
        max(0, Int((peak - 800).rounded()))
    }

    /// 85% 규칙 P-밴드 샘플링
    static func sampleAdaptive(pool: [Word], count n: Int, rating: Double, itemDeltas: [String: Double]) -> [Word] {
        guard n > 0, !pool.isEmpty else { return [] }
        var scored = pool.map { w -> (word: Word, p: Double) in
            (w, expectedP(rating, wordDifficulty(w, itemDelta: itemDeltas[w.target] ?? 0)))
        }
        scored.shuffle()

        var picked: [Word] = []
        var used = Set<String>()

        func take(from band: [(word: Word, p: Double)], limit: Int) {
            for item in band where picked.count < n && limit > picked.count - (picked.count - min(picked.count, limit)) {
                if picked.count >= n { break }
                if used.insert(item.word.target).inserted { picked.append(item.word) }
                if picked.count >= limit { break }
            }
        }

        let sweet = scored.filter { $0.p >= 0.70 && $0.p <= 0.90 }
        let challenge = scored.filter { $0.p >= 0.45 && $0.p < 0.70 }
        let confidence = scored.filter { $0.p > 0.90 }

        let sweetQuota = Int((Double(n) * 0.60).rounded())
        let challengeQuota = Int((Double(n) * 0.25).rounded())

        for item in sweet.prefix(sweetQuota) where used.insert(item.word.target).inserted {
            picked.append(item.word)
        }
        for item in challenge.prefix(challengeQuota) where used.insert(item.word.target).inserted {
            picked.append(item.word)
        }
        for item in confidence where picked.count < n {
            if used.insert(item.word.target).inserted { picked.append(item.word) }
        }
        if picked.count < n {
            // |P - 0.8| 오름차순으로 보충
            let rest = scored
                .filter { !used.contains($0.word.target) }
                .sorted { abs($0.p - 0.8) < abs($1.p - 0.8) }
            for item in rest where picked.count < n {
                if used.insert(item.word.target).inserted { picked.append(item.word) }
            }
        }
        return picked.shuffled()
    }
}
