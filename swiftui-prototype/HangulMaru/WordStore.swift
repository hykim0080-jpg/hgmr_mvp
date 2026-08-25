import Foundation
import Observation

@Observable
final class WordStore {
    var words: [Word] = []
    var screen: Screen = .welcome

    // MARK: - 영구 통계 (UserDefaults)
    var learnedWords: Set<String> = []
    var blueShards = 0
    var totalAnswered = 0
    var totalCorrect = 0
    var streakDays = 1
    var exp = 0
    var level = 1

    // MARK: - 세션 상태
    var session: [Word] = []
    var currentIndex = 0
    var sessionCorrect = 0
    var sessionShards = 0
    var comboStreak = 0
    var phase: QuizPhase = .answering
    var answerInput = ""

    static let sessionSize = 10
    static let expPerLevel = 200

    var currentWord: Word? {
        session.indices.contains(currentIndex) ? session[currentIndex] : nil
    }

    var accuracy: Int {
        totalAnswered == 0 ? 0 : Int(Double(totalCorrect) / Double(totalAnswered) * 100)
    }

    init() {
        loadWords()
        loadProgress()

        // 테스트용: HM_SCREEN 환경변수로 특정 화면에서 시작
        switch ProcessInfo.processInfo.environment["HM_SCREEN"] {
        case "home": screen = .home
        case "quiz": startSession()
        case "result":
            startSession()
            sessionCorrect = 8
            sessionShards = 10
            screen = .result
        default: break
        }
    }

    // MARK: - 데이터 로드

    private func loadWords() {
        guard let url = Bundle.main.url(forResource: "words", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([Word].self, from: data)
        else { return }
        words = decoded
    }

    private func loadProgress() {
        let d = UserDefaults.standard
        learnedWords = Set(d.stringArray(forKey: "learnedWords") ?? [])
        blueShards = d.integer(forKey: "blueShards")
        totalAnswered = d.integer(forKey: "totalAnswered")
        totalCorrect = d.integer(forKey: "totalCorrect")
        exp = d.integer(forKey: "exp")
        level = max(1, d.integer(forKey: "level"))
    }

    private func saveProgress() {
        let d = UserDefaults.standard
        d.set(Array(learnedWords), forKey: "learnedWords")
        d.set(blueShards, forKey: "blueShards")
        d.set(totalAnswered, forKey: "totalAnswered")
        d.set(totalCorrect, forKey: "totalCorrect")
        d.set(exp, forKey: "exp")
        d.set(level, forKey: "level")
    }

    // MARK: - 세션 흐름

    func startSession() {
        session = Array(words.shuffled().prefix(Self.sessionSize))
        currentIndex = 0
        sessionCorrect = 0
        sessionShards = 0
        comboStreak = 0
        phase = .answering
        answerInput = ""
        screen = .quiz
    }

    func submitAnswer() {
        guard let word = currentWord, phase == .answering else { return }
        let answer = answerInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !answer.isEmpty else { return }

        totalAnswered += 1
        learnedWords.insert(word.target)

        if word.accepts.contains(answer) {
            phase = .correct
            totalCorrect += 1
            sessionCorrect += 1
            comboStreak += 1
            var earned = 1
            if comboStreak % 3 == 0 { earned += 1 }  // 3연속 정답 보너스
            blueShards += earned
            sessionShards += earned
            gainExp(10)
        } else {
            phase = .wrong
            comboStreak = 0
            gainExp(2)
        }
        saveProgress()
    }

    func nextQuestion() {
        answerInput = ""
        phase = .answering
        if currentIndex + 1 < session.count {
            currentIndex += 1
        } else {
            screen = .result
        }
    }

    func goHome() {
        screen = .home
    }

    private func gainExp(_ amount: Int) {
        exp += amount
        while exp >= Self.expPerLevel {
            exp -= Self.expPerLevel
            level += 1
        }
    }
}
