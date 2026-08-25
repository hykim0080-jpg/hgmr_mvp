import Foundation

// MARK: - 단어

struct Word: Codable, Identifiable, Hashable {
    let target: String
    let accepts: [String]
    let meaning: String
    let sentence: String
    let level: Int
    let tags: [String]
    let ending: String?

    var id: String { target }

    var tagLabel: String {
        (tags.first ?? "전체").replacingOccurrences(of: "_", with: "·")
    }

    /// 용언 어미 분리 — 어간만 입력받고 어미는 문장에 미리 표시
    /// 웹앱 splitVerbEnding과 동일 규칙
    var stemAndSuffix: (stem: String, suffix: String) {
        if let ending {
            if ending.isEmpty { return (target, "") }
            let stem = target.hasSuffix("다") ? String(target.dropLast()) : target
            return (stem, ending)
        }
        if target.hasSuffix("하다") && target.count > 2 {
            return (String(target.dropLast(2)), "하다")
        }
        if target.hasSuffix("되다") && target.count > 2 {
            return (String(target.dropLast(2)), "되다")
        }
        if target.hasSuffix("다") && target.count > 1 {
            return (String(target.dropLast()), "다")
        }
        return (target, "")
    }

    var stem: String { stemAndSuffix.stem }
    var suffix: String { stemAndSuffix.suffix }

    /// accepts 각각에 같은 분리 규칙을 적용한 어간 목록 (중복 제거)
    var acceptedStems: [String] {
        var seen = Set<String>()
        var result: [String] = []
        for a in accepts {
            let s: String
            if let ending {
                s = ending.isEmpty ? a : (a.hasSuffix("다") ? String(a.dropLast()) : a)
            } else if a.hasSuffix("하다") && a.count > 2 {
                s = String(a.dropLast(2))
            } else if a.hasSuffix("되다") && a.count > 2 {
                s = String(a.dropLast(2))
            } else if a.hasSuffix("다") && a.count > 1 {
                s = String(a.dropLast())
            } else {
                s = a
            }
            if seen.insert(s).inserted { result.append(s) }
        }
        return result
    }

    /// target을 제외한 유의어 목록
    var synonyms: [String] { accepts.filter { $0 != target } }
}

// MARK: - 학습 기록 (learnedWords 엔트리, 웹앱 v3 스키마)

struct LearnedEntry: Codable, Hashable {
    var m: Bool      // 첫 시도 정답 이력 (마스터 = 낱말 조각)
    var d: String    // 마지막 학습일 "YYYY-MM-DD"
    var c: Int       // 첫 시도 정답 횟수
    var w: Int       // 오답 횟수
    var s: Int       // SRS 단계 0-4
    var n: String?   // 다음 복습일 "YYYY-MM-DD"
}

// MARK: - 퀴즈 큐 항목

struct QuizItem: Codable, Hashable, Identifiable {
    var target: String
    var isReview = false
    var reinserted = false   // 세션 내 재출제 (_reinserted)
    var synRetry = false     // 유의어 재도전 (_synRetry)

    var id: String { "\(target)-\(isReview)-\(reinserted)-\(synRetry)" }
}

// MARK: - 유저 데이터 (users/{uid} 문서 대응, 로컬 JSON 저장)

struct UserData: Codable {
    var exp = 0
    var streak = 0
    var lastDate = ""                       // "YYYY-MM-DD"
    var nickname = ""
    var avatarPose = "idle"                 // idle | clap | party | sad
    var scarfColor = "#10B981"
    var targetWordCount = 30
    var totalLearnedWords = 0
    var totalCorrectFirstTry = 0
    var blueShards = 0
    var equippedTitle = "🐣 아기 병아리"
    var learnedWords: [String: LearnedEntry] = [:]
    var flaggedWords: [String: Bool] = [:]
    var selectedTopic = "all"
    var vocabRating: Double? = nil
    var vocabRatingN = 0
    var vocabPeak: Double = 0
    var placementDone = false
    var ratingHistory: [RatingPoint] = []   // 최대 90
    var currentSession: SavedSession? = nil
}

struct RatingPoint: Codable, Hashable {
    var d: String
    var r: Double
}

struct SavedSession: Codable {
    var quizQueue: [QuizItem]
    var dailyTarget: Int
    var completedQuestions: Int
    var sessionCorrectFirstTry: Int
}

// MARK: - 전 유저 답안 통계 (word_stats 대응, 로컬 시뮬레이션)

struct WordStat: Codable {
    var answers: [String: Int] = [:]
    var total = 0
}

// MARK: - 단어 신고 (word_reports 대응)

struct WordReport: Codable, Identifiable {
    var target: String
    var reason: String
    var detail: String
    var d: String
    var id: String { target + d }
}

// MARK: - 주제

struct Topic: Identifiable {
    let key: String
    let emoji: String
    let name: String
    let tags: [String]
    var id: String { key }
}

enum Topics {
    static let all: [Topic] = [
        Topic(key: "all", emoji: "🎯", name: "전체", tags: []),
        Topic(key: "학술", emoji: "🎓", name: "학술", tags: ["학술_논리", "교육_학술", "학술_윤리", "철학_인문"]),
        Topic(key: "수능", emoji: "✏️", name: "수능", tags: ["수능"]),
        Topic(key: "비즈니스", emoji: "💼", name: "비즈니스", tags: ["격식_비즈니스", "비즈니스", "경제_경영", "경제", "경제_금융", "사회_경제", "금융"]),
        Topic(key: "사회", emoji: "🏛️", name: "사회", tags: ["사회", "사회_문화", "사회_일반", "사회_제도", "사회_직업", "사회_행사", "사회_관계", "사회_정치", "문화_예술", "문화", "문화_스포츠", "법률", "법률_제도", "스포츠", "스포츠_게임", "미디어"]),
        Topic(key: "감정", emoji: "💗", name: "감정", tags: ["감정_심리", "심리"]),
    ]

    static func topic(for key: String) -> Topic {
        all.first { $0.key == key } ?? all[0]
    }
}

// MARK: - 칭호 / 업적

struct TitleDef: Identifiable {
    let title: String
    let condition: String
    let isUnlocked: (UserData) -> Bool
    var id: String { title }
}

enum Titles {
    static let all: [TitleDef] = [
        TitleDef(title: "🐣 아기 병아리", condition: "기본 해제") { _ in true },
        TitleDef(title: "🌱 새싹 학습자", condition: "누적 완료 단어 10개") { $0.totalLearnedWords >= 10 },
        TitleDef(title: "📚 어휘 수집가", condition: "누적 완료 단어 50개") { $0.totalLearnedWords >= 50 },
        TitleDef(title: "👑 세종의 후예", condition: "누적 완료 단어 150개") { $0.totalLearnedWords >= 150 },
        TitleDef(title: "🔥 작심삼일 극복", condition: "연속 학습 3일") { $0.streak >= 3 },
        TitleDef(title: "🏆 한글 마스터", condition: "레벨 5 달성") { ($0.exp / 200) + 1 >= 5 },
    ]

    /// 레벨 배지 옆 자동 칭호
    static func levelTitle(_ level: Int) -> String {
        if level >= 5 { return "👑 세종의 후예" }
        if level >= 4 { return "🏆 한글 지배자" }
        if level >= 3 { return "📚 어휘 수집가" }
        if level >= 2 { return "🌱 한글 새싹" }
        return "🐣 한글 알망이"
    }
}

struct BadgeDef: Identifiable {
    let name: String
    let emoji: String
    let condition: String
    let borderHex: String
    let isUnlocked: (UserData) -> Bool
    var id: String { name }
}

enum Badges {
    static let all: [BadgeDef] = [
        BadgeDef(name: "새싹 학습자", emoji: "🌱", condition: "누적 완료 단어 10개 이상 달성", borderHex: "#10b981") { $0.totalLearnedWords >= 10 },
        BadgeDef(name: "어휘 수집가", emoji: "📚", condition: "누적 완료 단어 50개 이상 달성", borderHex: "#3b82f6") { $0.totalLearnedWords >= 50 },
        BadgeDef(name: "세종의 후예", emoji: "👑", condition: "누적 완료 단어 150개 이상 달성", borderHex: "#8b5cf6") { $0.totalLearnedWords >= 150 },
        BadgeDef(name: "작심삼일 극복", emoji: "🔥", condition: "연속 학습 3일 이상 달성", borderHex: "#ef4444") { $0.streak >= 3 },
        BadgeDef(name: "한글 마스터", emoji: "🏆", condition: "학습 레벨 5 이상 달성", borderHex: "#f59e0b") { ($0.exp / 200) + 1 >= 5 },
    ]

    static func count(_ data: UserData) -> Int {
        all.filter { $0.isUnlocked(data) }.count
    }
}

// MARK: - 날짜 유틸

enum DateUtil {
    static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f
    }()

    static func todayString() -> String { formatter.string(from: Date()) }

    static func string(from date: Date) -> String { formatter.string(from: date) }

    static func date(from string: String) -> Date? { formatter.date(from: string) }

    static func addDays(_ days: Int, to string: String) -> String {
        guard let d = date(from: string),
              let nd = Calendar.current.date(byAdding: .day, value: days, to: d) else { return string }
        return formatter.string(from: nd)
    }

    static func daysBetween(_ from: String, _ to: String) -> Int {
        guard let f = date(from: from), let t = date(from: to) else { return 0 }
        return Calendar.current.dateComponents([.day], from: f, to: t).day ?? 0
    }
}
