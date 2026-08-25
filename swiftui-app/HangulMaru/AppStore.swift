import Foundation
import Observation
import SwiftUI

// MARK: - 인증 (Firebase 대체 로컬 모킹 — UI/UX 평가용)

struct AuthUser: Codable {
    var uid: String
    var email: String?
    var isAnonymous: Bool
    var displayName: String?
}

enum Screen: Equatable {
    case welcome, emailLogin, home, quiz, result
}

enum AnswerPhase: Equatable {
    case answering
    case correct          // 완전 정답
    case synonym(String)  // 유의어 정답 (입력했던 답)
    case revealed         // 정답 보기
}

enum HarangMood: Equatable {
    case idle, clap, wrong, party
}

struct Toast: Identifiable, Equatable {
    let id = UUID()
    var message: String
    var isError = false
    var duration: Double = 3.5
}

private let adminEmails = ["hykim0080@gmail.com"]

@Observable
final class AppStore {
    // MARK: 데이터
    var words: [Word] = []
    var wordsByTarget: [String: Word] = [:]

    // MARK: 인증
    var user: AuthUser?
    var hasPersistedSession = false   // 시작 게이트 ("화면을 터치하여 시작하기")
    var splashDone = false
    var authMode: AuthMode = .login
    enum AuthMode { case login, signup }

    var isAdmin: Bool {
        guard let user, !user.isAnonymous, let email = user.email else { return false }
        return adminEmails.contains(email)
    }

    // MARK: 화면
    var screen: Screen = .welcome

    // MARK: 유저 데이터
    var data = UserData()

    // MARK: 전역(공용) 데이터 — meta/item_ratings, word_stats, word_reports 대응
    var itemRatingDeltas: [String: Double] = [:]
    var wordStats: [String: WordStat] = [:]
    var reports: [String: [WordReport]] = [:]

    // MARK: 세션 상태
    var quizQueue: [QuizItem] = []
    var dailyTarget = 30
    var completedQuestions = 0
    var sessionCorrectFirstTry = 0
    var sessionBlueShards = 0
    var sessionNewWords = 0
    var retryCount = 0
    var comboCount = 0
    var sessionRatingDelta: Double = 0
    var hasFailedCurrent = false
    var phase: AnswerPhase = .answering
    var answerInput = ""
    var statsPanelRows: [(answer: String, count: Int)] = []
    var lastGainBlue = 0
    var lastGainGreen = false

    // MARK: 배치고사
    var isPlacement = false
    var placementCount = 0
    var placementWrong = 0
    var placementPool: [Word] = []
    var placementRecent: [Double] = []
    var placementIntroShownThisRun = false

    // MARK: 하랑이 컴패니언
    var harangMood: HarangMood = .idle
    var harangBubble: String? = nil
    var harangBubbleColor: Color = HM.textPrimary
    private var moodTask: Task<Void, Never>? = nil
    private var bubbleTask: Task<Void, Never>? = nil

    // MARK: 모달
    var showTopicModal = false
    var showCalendarModal = false
    var showVocabModal = false
    var showStatsModal = false
    var showAchievementModal = false
    var showExitConfirm = false
    var showLogoutConfirm = false
    var showResumeModal = false
    var showReportModal = false
    var showProfileSheet = false
    var showPlacementIntro = false
    var showPlacementResult = false
    var showAltitudeGuide = false
    var showAdminPanel = false

    // MARK: 토스트
    var toast: Toast? = nil
    private var toastTask: Task<Void, Never>? = nil

    var currentItem: QuizItem? { quizQueue.first }
    var currentWord: Word? { currentItem.flatMap { wordsByTarget[$0.target] } }

    /// 방금 답한 단어 (통계 패널 표시 중엔 푼 문제를 계속 보여줌)
    var answeredWord: Word? = nil
    var answeredItem: QuizItem? = nil

    /// 화면에 표시할 단어: 답변 대기 중엔 현재 문제, 제출 후엔 방금 푼 문제
    var displayWord: Word? {
        phase == .answering ? currentWord : (answeredWord ?? currentWord)
    }
    var displayItem: QuizItem? {
        phase == .answering ? currentItem : (answeredItem ?? currentItem)
    }
    var level: Int { data.exp / 200 + 1 }

    // MARK: - 초기화

    init() {
        loadWords()
        loadGlobal()
        if let saved = Store.loadAuth() {
            user = saved
            hasPersistedSession = true
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(650))  // SPLASH_MIN_MS
            splashDone = true
        }

        // 테스트용: HM_AUTO 환경변수로 특정 상태 진입 (스크린샷 검증)
        if let auto = ProcessInfo.processInfo.environment["HM_AUTO"] {
            hasPersistedSession = false
            signInAnonymously()
            switch auto {
            case "quiz":
                showPlacementIntro = false
                data.placementDone = true
                startSession()
            case "placement":
                startPlacement()
            case "answered":
                showPlacementIntro = false
                data.placementDone = true
                startSession()
                if let w = currentWord {
                    answerInput = w.stem
                    submitAnswer()
                }
            case "result":
                data.placementDone = true
                showPlacementIntro = false
                startSession()
                sessionBlueShards = 12
                sessionNewWords = 8
                completedQuestions = data.targetWordCount
                screen = .result
            default:
                break
            }
        }
    }

    private func loadWords() {
        guard let url = Bundle.main.url(forResource: "words", withExtension: "json"),
              let d = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([Word].self, from: d) else { return }
        words = decoded
        // words.json에 중복 표제어가 있을 수 있음 (예: '기여') — 첫 항목 우선
        wordsByTarget = Dictionary(decoded.map { ($0.target, $0) }, uniquingKeysWith: { first, _ in first })
    }

    // MARK: - 토스트

    func showToast(_ message: String, isError: Bool = false, duration: Double = 3.5) {
        toastTask?.cancel()
        toast = Toast(message: message, isError: isError, duration: duration)
        toastTask = Task { @MainActor in
            try? await Task.sleep(for: .seconds(duration))
            if !Task.isCancelled { toast = nil }
        }
    }

    // MARK: - 하랑이

    func showHarangMotion(_ mood: HarangMood, ms: Int) {
        moodTask?.cancel()
        harangMood = mood
        moodTask = Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(ms))
            if !Task.isCancelled { harangMood = .idle }
        }
    }

    func harangSay(_ text: String, color: Color = HM.textPrimary, ms: Int = 2400) {
        bubbleTask?.cancel()
        harangBubble = text
        harangBubbleColor = color
        bubbleTask = Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(ms))
            if !Task.isCancelled { harangBubble = nil }
        }
    }

    // MARK: - 인증 흐름

    func signInAnonymously() {
        let anon = AuthUser(uid: "anon-\(UUID().uuidString.prefix(8))", email: nil, isAnonymous: true, displayName: nil)
        completeSignIn(anon)
    }

    func signInGoogle() {
        // 로컬 모킹: 실제 Firebase 연동 전까지 데모 계정으로 진입
        let g = AuthUser(uid: "google-demo", email: "demo@gmail.com", isAnonymous: false, displayName: "Google 사용자")
        completeSignIn(g)
    }

    func submitEmailAuth(email: String, password: String, passwordConfirm: String) {
        let email = email.trimmingCharacters(in: .whitespaces)
        guard !email.isEmpty, !password.isEmpty else {
            showToast("이메일과 비밀번호를 입력해 주세요.", isError: true); return
        }
        guard email.contains("@"), email.contains(".") else {
            showToast("이메일 형식이 올바르지 않아요.", isError: true); return
        }
        var accounts = Store.loadAccounts()
        if authMode == .signup {
            guard password.count >= 6 else {
                showToast("비밀번호는 6자 이상이어야 해요.", isError: true); return
            }
            guard password == passwordConfirm else {
                showToast("비밀번호가 서로 달라요. 다시 확인해 주세요.", isError: true); return
            }
            if accounts[email] != nil {
                showToast("이미 가입된 이메일이에요. 로그인해 주세요.", isError: true)
                authMode = .login
                return
            }
            accounts[email] = password
            Store.saveAccounts(accounts)
            showToast("가입 완료! 환영해요 🦭")
            completeSignIn(AuthUser(uid: "email-\(email)", email: email, isAnonymous: false, displayName: nil))
        } else {
            guard let stored = accounts[email] else {
                showToast("이메일 또는 비밀번호가 올바르지 않아요. 처음이라면 회원가입해 주세요.", isError: true, duration: 4.5)
                return
            }
            guard stored == password else {
                showToast("비밀번호가 올바르지 않아요.", isError: true); return
            }
            completeSignIn(AuthUser(uid: "email-\(email)", email: email, isAnonymous: false, displayName: nil))
        }
    }

    func sendPasswordReset(email: String) {
        guard !email.isEmpty else {
            showToast("이메일을 먼저 입력해 주세요.", isError: true); return
        }
        showToast("비밀번호 재설정 메일을 보냈어요. 메일함을 확인해 주세요!", duration: 5.0)
    }

    private func completeSignIn(_ u: AuthUser) {
        user = u
        Store.saveAuth(u)
        enterApp()
    }

    /// 시작 게이트 통과 (지속 세션)
    func enterFromGate() {
        hasPersistedSession = false
        enterApp()
    }

    func enterApp() {
        guard let user else { return }
        data = Store.loadUserData(uid: user.uid) ?? UserData()
        if data.nickname.isEmpty {
            data.nickname = user.isAnonymous ? "익명 사용자" : (user.displayName ?? user.email?.components(separatedBy: "@").first ?? "학습자")
        }
        // 스트릭 깨짐 검증
        let today = DateUtil.todayString()
        let yesterday = DateUtil.addDays(-1, to: today)
        if !data.lastDate.isEmpty && data.lastDate != today && data.lastDate != yesterday {
            data.streak = 1
        }
        if data.streak == 0 { data.streak = 1 }
        // 기존 유저 마이그레이션: vocabRating 없는데 학습 기록 있음 → 배치 생략
        if data.vocabRating == nil && !data.learnedWords.isEmpty {
            let mastered = data.learnedWords.values.filter(\.m).count
            data.vocabRating = 1100 + Double(min(250, mastered * 3))
            data.vocabRatingN = min(60, data.learnedWords.count)
            data.placementDone = true
        }
        if data.vocabPeak == 0, let r = data.vocabRating, data.vocabRatingN > 0 {
            data.vocabPeak = r.rounded()
        }
        saveUserData()
        screen = .home

        // 이어하기 or 배치고사 안내
        if let s = data.currentSession, !s.quizQueue.isEmpty {
            showResumeModal = true
        } else if !data.placementDone && data.learnedWords.isEmpty && !placementIntroShownThisRun {
            Task { @MainActor in
                try? await Task.sleep(for: .milliseconds(400))
                guard !self.data.placementDone, self.screen == .home,
                      !self.placementIntroShownThisRun else { return }
                self.showPlacementIntro = true
                self.placementIntroShownThisRun = true
            }
        }
    }

    func signOut() {
        Store.clearAuth()
        user = nil
        hasPersistedSession = false
        data = UserData()
        screen = .welcome
        showProfileSheet = false
        showLogoutConfirm = false
    }

    // MARK: - 저장

    func saveUserData() {
        guard let user else { return }
        Store.saveUserData(data, uid: user.uid)
    }

    private func loadGlobal() {
        let g = Store.loadGlobal()
        itemRatingDeltas = g.itemDeltas
        wordStats = g.wordStats
        reports = g.reports
    }

    func saveGlobal() {
        Store.saveGlobal(itemDeltas: itemRatingDeltas, wordStats: wordStats, reports: reports)
    }

    // MARK: - 어휘 고도

    var rating: Double { data.vocabRating ?? 1200 }
    var isRated: Bool { data.vocabRating != nil && data.vocabRatingN > 0 }
    var altitude: Int { VocabEngine.altitude(peak: data.vocabPeak) }
    var tierName: String { VocabEngine.tier(data.vocabPeak) }

    func tierEmoji(_ tier: String) -> String {
        switch tier {
        case "마루": return "☀️"
        case "능선": return "⛰"
        case "중턱": return "🏔"
        case "오르막": return "🥾"
        default: return "🌱"
        }
    }

    private func rateAnswer(_ word: Word, outcome: Double) {
        let b = VocabEngine.wordDifficulty(word, itemDelta: itemRatingDeltas[word.target] ?? 0)
        let p = VocabEngine.expectedP(rating, b)
        let delta = VocabEngine.userK(data.vocabRatingN) * (outcome - p)
        data.vocabRating = VocabEngine.clampRating(rating + delta)
        data.vocabRatingN += 1
        sessionRatingDelta += delta
        let itemD = -2.5 * (outcome - p)
        itemRatingDeltas[word.target, default: 0] += (itemD * 10).rounded() / 10
    }

    private func raisePeak() {
        if let r = data.vocabRating, r.rounded() > data.vocabPeak {
            data.vocabPeak = r.rounded()
        }
    }

    private func pushRatingHistory() {
        guard let r = data.vocabRating else { return }
        let today = DateUtil.todayString()
        if let idx = data.ratingHistory.firstIndex(where: { $0.d == today }) {
            data.ratingHistory[idx].r = r
        } else {
            data.ratingHistory.append(RatingPoint(d: today, r: r))
            if data.ratingHistory.count > 90 {
                data.ratingHistory.removeFirst(data.ratingHistory.count - 90)
            }
        }
    }

    // MARK: - 학습 기록 (SRS)

    private func recordLearned(_ target: String, firstTry: Bool) {
        let today = DateUtil.todayString()
        var entry = data.learnedWords[target] ?? LearnedEntry(m: false, d: today, c: 0, w: 0, s: 0, n: nil)
        entry.d = today
        if firstTry {
            let newlyMastered = !entry.m
            entry.m = true
            entry.c += 1
            entry.s = min(entry.s + 1, 4)
            entry.n = DateUtil.addDays(VocabEngine.srsIntervals[entry.s], to: today)
            if newlyMastered {
                sessionNewWords += 1
                data.totalLearnedWords += 1
            }
            data.totalCorrectFirstTry += 1
        } else {
            entry.w += firstTry ? 0 : 1
            entry.s = 0
            entry.n = DateUtil.addDays(1, to: today)  // 익일 복습
        }
        data.learnedWords[target] = entry
    }

    // MARK: - 세션 편성

    private func isDueForReview(_ entry: LearnedEntry) -> Bool {
        let today = DateUtil.todayString()
        if let n = entry.n { return n <= today }
        return DateUtil.daysBetween(entry.d, today) > 3
    }

    var dueReviewInfo: (total: Int, wrong: Int) {
        var total = 0, wrong = 0
        for (_, e) in data.learnedWords where isDueForReview(e) {
            total += 1
            if e.w > 0 { wrong += 1 }
        }
        return (total, wrong)
    }

    func startSession() {
        let target = data.targetWordCount
        var freshWords: [Word] = []
        var dueWrong: [(Word, LearnedEntry)] = []
        var dueNormal: [(Word, LearnedEntry)] = []
        var notDue: [(Word, LearnedEntry)] = []

        for w in words {
            if let e = data.learnedWords[w.target] {
                if isDueForReview(e) {
                    if e.w > 0 { dueWrong.append((w, e)) } else { dueNormal.append((w, e)) }
                } else {
                    notDue.append((w, e))
                }
            } else {
                freshWords.append(w)
            }
        }
        dueWrong.sort { ($1.1.w, $0.1.s) < ($0.1.w, $1.1.s) }
        dueNormal.sort { $0.1.d < $1.1.d }

        let reviewPool = dueWrong + dueNormal
        let reviewQuota = min(reviewPool.count, Int(ceil(Double(target) * 0.4)))
        var queue: [QuizItem] = reviewPool.prefix(reviewQuota).map {
            QuizItem(target: $0.0.target, isReview: true)
        }

        let newQuota = target - queue.count
        if newQuota > 0 {
            var picked: [Word] = []
            let topic = Topics.topic(for: data.selectedTopic)
            if data.selectedTopic != "all" && !topic.tags.isEmpty {
                let topicWords = freshWords.filter { w in w.tags.contains(where: topic.tags.contains) }
                let others = freshWords.filter { w in !w.tags.contains(where: topic.tags.contains) }
                let topicCount = min(Int(ceil(Double(newQuota) * 0.65)), topicWords.count)
                picked = VocabEngine.sampleAdaptive(pool: topicWords, count: topicCount, rating: rating, itemDeltas: itemRatingDeltas)
                picked += VocabEngine.sampleAdaptive(pool: others, count: newQuota - picked.count, rating: rating, itemDeltas: itemRatingDeltas)
            } else {
                picked = VocabEngine.sampleAdaptive(pool: freshWords, count: newQuota, rating: rating, itemDeltas: itemRatingDeltas)
            }
            queue += picked.map { QuizItem(target: $0.target) }
        }

        // 부족분 보충: 남은 복습 풀 → notDue 오래된 순
        if queue.count < target {
            let usedTargets = Set(queue.map(\.target))
            let extraReviews = reviewPool.dropFirst(reviewQuota).filter { !usedTargets.contains($0.0.target) }
            queue += extraReviews.prefix(target - queue.count).map { QuizItem(target: $0.0.target, isReview: true) }
        }
        if queue.count < target {
            let usedTargets = Set(queue.map(\.target))
            let fill = notDue.sorted { $0.1.d < $1.1.d }.filter { !usedTargets.contains($0.0.target) }
            queue += fill.prefix(target - queue.count).map { QuizItem(target: $0.0.target, isReview: true) }
        }

        quizQueue = queue.shuffled()
        dailyTarget = quizQueue.count
        completedQuestions = 0
        sessionCorrectFirstTry = 0
        sessionBlueShards = 0
        sessionNewWords = 0
        retryCount = 0
        comboCount = 0
        sessionRatingDelta = 0
        prepareQuestion()
        syncSession()
        screen = .quiz
    }

    func resumeSession() {
        guard let s = data.currentSession else { return }
        quizQueue = s.quizQueue
        dailyTarget = s.dailyTarget
        completedQuestions = s.completedQuestions
        sessionCorrectFirstTry = s.sessionCorrectFirstTry
        sessionBlueShards = 0
        sessionNewWords = 0
        retryCount = 0
        comboCount = 0
        sessionRatingDelta = 0
        showResumeModal = false
        prepareQuestion()
        screen = .quiz
    }

    func discardSavedSession() {
        data.currentSession = nil
        saveUserData()
        showResumeModal = false
    }

    private func syncSession() {
        data.currentSession = SavedSession(
            quizQueue: quizQueue, dailyTarget: dailyTarget,
            completedQuestions: completedQuestions, sessionCorrectFirstTry: sessionCorrectFirstTry)
        saveUserData()
    }

    private func prepareQuestion() {
        phase = .answering
        answerInput = ""
        hasFailedCurrent = false
        statsPanelRows = []
        lastGainBlue = 0
        lastGainGreen = false
        answeredWord = nil
        answeredItem = nil
    }

    /// 홈 ✕ 종료: 로컬 큐만 비움 — 저장된 세션은 유지 (이어하기 가능)
    func exitToHome() {
        quizQueue = []
        showExitConfirm = false
        isPlacement = false
        screen = .home
    }

    // MARK: - 채점

    private func recordWordStat(_ target: String, answer: String) {
        var key = answer.trimmingCharacters(in: .whitespaces)
        key = String(key.prefix(30))
        key = key.replacingOccurrences(of: #"[\.\#\$\/\[\]]"#, with: "", options: .regularExpression)
        if key.isEmpty { key = "알수없음" }
        var stat = wordStats[target] ?? WordStat()
        stat.answers[key, default: 0] += 1
        stat.total += 1
        wordStats[target] = stat
        saveGlobal()
    }

    private func buildStatsPanel(for word: Word, myAnswer: String) {
        var answers = wordStats[word.target]?.answers ?? [:]
        if answers[myAnswer] == nil { answers[myAnswer] = 1 }
        statsPanelRows = answers.sorted { $0.value > $1.value }.prefix(5).map { ($0.key, $0.value) }
    }

    func statBadge(for answer: String, word: Word) -> (label: String, isCorrect: Bool, isSynonym: Bool) {
        if answer == word.target || answer == word.stem { return ("정답", true, false) }
        if word.accepts.contains(answer) || word.acceptedStems.contains(answer) { return ("유의어", false, true) }
        return ("오답", false, false)
    }

    func submitAnswer() {
        guard phase == .answering, let item = currentItem, let word = currentWord else { return }
        let answer = answerInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !answer.isEmpty else { return }

        if isPlacement {
            handlePlacementAnswer(word: word, answer: answer)
            return
        }

        let isNewWord = data.learnedWords[word.target] == nil
        let firstAction = !hasFailedCurrent

        // 1) 완전 정답
        if answer == word.stem || answer == word.target {
            recordWordStat(word.target, answer: answer)
            if firstAction && isNewWord && !item.reinserted && !item.synRetry {
                rateAnswer(word, outcome: 1)
            }
            grantCorrectRewards(word: word, item: item, firstTry: !hasFailedCurrent)
            recordLearned(word.target, firstTry: !hasFailedCurrent)
            if item.reinserted && !item.synRetry && !hasFailedCurrent {
                harangSay("아까 놓쳤던 단어를 다시 맞혔어요!", color: HM.greenDeep, ms: 3000)
            }
            phase = .correct
            advanceAfterAnswer(word: word, myAnswer: answer)
            return
        }

        // 2) 유의어
        if word.accepts.contains(answer) || word.acceptedStems.contains(answer) {
            if item.synRetry {
                // 재도전 문항에서 또 유의어 → 채점 없이 부드러운 재시도
                answerInput = ""
                harangSay("좋은 단어예요! 아까 본 단어를 떠올려 볼까요?", ms: 2800)
                return
            }
            recordWordStat(word.target, answer: answer)
            if firstAction && isNewWord && !item.reinserted {
                rateAnswer(word, outcome: 1)
            }
            grantCorrectRewards(word: word, item: item, firstTry: !hasFailedCurrent, greenEligible: false)
            let alreadyMastered = data.learnedWords[word.target]?.m ?? false
            if !hasFailedCurrent && !alreadyMastered {
                // 학습 기록 유예 + 유의어 재도전 재삽입
                reinsert(QuizItem(target: word.target, isReview: item.isReview, reinserted: item.reinserted, synRetry: true))
            } else {
                recordLearned(word.target, firstTry: !hasFailedCurrent)
            }
            phase = .synonym(answer)
            advanceAfterAnswer(word: word, myAnswer: answer)
            return
        }

        // 3) 오답
        comboCount = 0
        showHarangMotion(.wrong, ms: 1400)
        if !hasFailedCurrent {
            if isNewWord && !item.reinserted && !item.synRetry {
                rateAnswer(word, outcome: 0)
            }
            hasFailedCurrent = true
            retryCount += 1
            reinsert(QuizItem(target: word.target, isReview: item.isReview, reinserted: true))
            syncSession()
        }
        answerInput = ""
        phase = .answering
        wrongFlashTrigger += 1
    }

    var wrongFlashTrigger = 0   // 오답 shake 트리거

    private func grantCorrectRewards(word: Word, item: QuizItem, firstTry: Bool, greenEligible: Bool = true) {
        comboCount += 1
        let comboBonus = comboCount % 3 == 0 ? 1 : 0
        let blueGain = 1 + comboBonus
        data.blueShards += blueGain
        sessionBlueShards += blueGain
        lastGainBlue = blueGain
        let prevMastered = data.learnedWords[word.target]?.m ?? false
        lastGainGreen = greenEligible && firstTry && !prevMastered
        if firstTry {
            data.exp += 20
            sessionCorrectFirstTry += 1
        }
        showHarangMotion(.clap, ms: 1800)
        if comboCount >= 2 {
            harangSay("🔥 \(comboCount)연속!", color: Color(hex: "#b45309"), ms: 2200)
        }
    }

    private func advanceAfterAnswer(word: Word, myAnswer: String) {
        answeredWord = word
        answeredItem = currentItem
        quizQueue.removeFirst()
        completedQuestions += 1
        buildStatsPanel(for: word, myAnswer: myAnswer)
        syncSession()
        if quizQueue.isEmpty {
            // 통계 패널 "다음"에서 finishSession 호출됨 — 여기서는 대기
        }
    }

    func revealAnswer() {
        guard phase == .answering, let item = currentItem, let word = currentWord else { return }
        if isPlacement {
            placementReveal(word: word)
            return
        }
        comboCount = 0
        recordWordStat(word.target, answer: "모르겠어요")
        if !hasFailedCurrent {
            let isNewWord = data.learnedWords[word.target] == nil
            if isNewWord && !item.reinserted && !item.synRetry {
                rateAnswer(word, outcome: 0)
            }
            retryCount += 1
            reinsert(QuizItem(target: word.target, isReview: item.isReview, reinserted: true))
        }
        recordLearned(word.target, firstTry: false)
        phase = .revealed
        answeredWord = word
        answeredItem = currentItem
        quizQueue.removeFirst()   // completedQuestions는 증가하지 않음
        buildStatsPanel(for: word, myAnswer: "모르겠어요")
        syncSession()
    }

    private func reinsert(_ item: QuizItem) {
        let gap = Int.random(in: 3...6)
        let idx = min(quizQueue.count, gap)
        quizQueue.insert(item, at: idx)
    }

    func nextQuestion() {
        if quizQueue.isEmpty {
            finishSession()
        } else {
            prepareQuestion()
        }
    }

    // MARK: - 세션 완료

    private func finishSession() {
        let today = DateUtil.todayString()
        let yesterday = DateUtil.addDays(-1, to: today)
        if data.lastDate == yesterday {
            data.streak += 1
        } else if data.lastDate != today {
            data.streak = 1
        }
        data.lastDate = today
        raisePeak()
        pushRatingHistory()
        data.currentSession = nil
        saveUserData()
        saveGlobal()
        screen = .result
    }

    // MARK: - 배치고사

    static let placementMax = 20
    static let placementMin = 15
    static let placementRetries = 3

    func startPlacement() {
        showPlacementIntro = false
        isPlacement = true
        data.vocabRating = 1200
        data.vocabRatingN = 0
        placementCount = 0
        placementRecent = []
        placementPool = words
        sessionBlueShards = 0
        sessionNewWords = 0
        quizQueue = []
        dailyTarget = Self.placementMax
        completedQuestions = 0
        pickPlacementWord()
        prepareQuestion()
        placementWrong = 0
        screen = .quiz
    }

    private func pickPlacementWord() {
        guard !placementPool.isEmpty else { return }
        let scored = placementPool
            .map { w in (w, abs(VocabEngine.expectedP(rating, VocabEngine.wordDifficulty(w, itemDelta: itemRatingDeltas[w.target] ?? 0)) - 0.65)) }
            .sorted { $0.1 < $1.1 }
        let candidates = scored.prefix(8).map(\.0)
        guard let pick = candidates.randomElement() else { return }
        placementPool.removeAll { $0.target == pick.target }
        quizQueue = [QuizItem(target: pick.target)]
    }

    private func ratePlacement(_ word: Word, outcome: Double) {
        let k = max(40, 120 - 6 * Double(placementCount))
        let b = VocabEngine.wordDifficulty(word, itemDelta: itemRatingDeltas[word.target] ?? 0)
        let p = VocabEngine.expectedP(rating, b)
        data.vocabRating = VocabEngine.clampRating(rating + k * (outcome - p))
        placementCount += 1
        placementRecent.append(rating)
        if placementRecent.count > 6 { placementRecent.removeFirst() }
    }

    private func handlePlacementAnswer(word: Word, answer: String) {
        if answer == word.target || answer == word.stem
            || word.accepts.contains(answer) || word.acceptedStems.contains(answer) {
            ratePlacement(word, outcome: 1)
            recordLearned(word.target, firstTry: placementWrong == 0)
            showHarangMotion(.clap, ms: 1400)
            phase = .correct
            completedQuestions += 1
        } else {
            placementWrong += 1
            showHarangMotion(.wrong, ms: 1200)
            answerInput = ""
            wrongFlashTrigger += 1
            if placementWrong <= Self.placementRetries {
                return   // 재입력 기회 (같은 문항 최대 3회)
            }
            ratePlacement(word, outcome: 0)
            recordLearned(word.target, firstTry: false)
            phase = .revealed
            completedQuestions += 1
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(900))
            self.placementAdvance()
        }
    }

    private func placementReveal(word: Word) {
        ratePlacement(word, outcome: 0)
        recordLearned(word.target, firstTry: false)
        phase = .revealed
        completedQuestions += 1
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(900))
            self.placementAdvance()
        }
    }

    private func placementAdvance() {
        guard isPlacement else { return }
        let converged = placementCount >= Self.placementMin
            && placementRecent.count >= 6
            && (placementRecent.max()! - placementRecent.min()!) <= 100
        if placementCount >= Self.placementMax || placementPool.isEmpty || converged {
            finishPlacement()
        } else {
            placementWrong = 0
            pickPlacementWord()
            prepareQuestion()
        }
    }

    private func finishPlacement() {
        isPlacement = false
        data.placementDone = true
        data.vocabRatingN = 30
        data.blueShards += 15
        raisePeak()
        pushRatingHistory()
        saveUserData()
        screen = .home
        showPlacementResult = true
    }

    // MARK: - 프로필 / 주제 / 신고

    func saveProfile(nickname: String, pose: String, scarf: String, title: String, targetCount: Int) {
        let name = nickname.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else {
            showToast("활동명을 입력해주세요!", isError: true); return
        }
        data.nickname = name
        data.avatarPose = pose
        data.scarfColor = scarf
        data.equippedTitle = title
        data.targetWordCount = targetCount
        saveUserData()
        showProfileSheet = false
        showToast("저장되었어요! 🦭")
    }

    func selectTopic(_ key: String) {
        data.selectedTopic = key
        saveUserData()
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(150))
            self.showTopicModal = false
        }
    }

    func submitReport(word: Word, reason: String?, detail: String) {
        let trimmedDetail = String(detail.prefix(500))
        if reason == nil && trimmedDetail.isEmpty {
            showToast("신고 사유를 선택하거나 내용을 적어 주세요.", isError: true)
            return
        }
        let report = WordReport(target: word.target, reason: reason ?? "(미선택)",
                                detail: trimmedDetail, d: ISO8601DateFormatter().string(from: Date()))
        reports[word.target, default: []].append(report)
        data.flaggedWords[word.target] = true
        saveUserData()
        saveGlobal()
        showReportModal = false
        showToast("신고가 접수됐어요. 검토 후 반영할게요 🦭")
    }

    func unflagWord(_ target: String) {
        data.flaggedWords.removeValue(forKey: target)
        saveUserData()
        showReportModal = false
    }

    // MARK: - 통계 파생값

    var learnedVal: Int { max(data.totalLearnedWords, data.learnedWords.count) }

    var accuracyText: String {
        guard learnedVal > 0 else { return "-" }
        let v = Double(min(data.totalCorrectFirstTry, learnedVal)) / Double(learnedVal) * 100
        return "\(Int(v.rounded()))%"
    }

    var attendanceDates: Set<String> {
        var s = Set(data.learnedWords.values.map(\.d))
        if !data.lastDate.isEmpty { s.insert(data.lastDate) }
        return s
    }

    var todayLearnedCount: Int {
        let today = DateUtil.todayString()
        return data.learnedWords.values.filter { $0.d == today }.count
    }

    /// 낱말카드 대상: m == true, 최근 학습순
    var masteredWords: [(word: Word, entry: LearnedEntry)] {
        data.learnedWords
            .filter { $0.value.m }
            .compactMap { k, v in wordsByTarget[k].map { ($0, v) } }
            .sorted { $0.1.d > $1.1.d }
    }
}

// MARK: - 로컬 저장소 (Firebase 대체)

enum Store {
    static let dir: URL = {
        let d = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("hangulmaru", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        return d
    }()

    private static func write<T: Encodable>(_ value: T, to name: String) {
        let enc = JSONEncoder()
        if let data = try? enc.encode(value) {
            try? data.write(to: dir.appendingPathComponent(name))
        }
    }

    private static func read<T: Decodable>(_ type: T.Type, from name: String) -> T? {
        guard let data = try? Data(contentsOf: dir.appendingPathComponent(name)) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    static func loadAuth() -> AuthUser? { read(AuthUser.self, from: "auth.json") }
    static func saveAuth(_ u: AuthUser) { write(u, to: "auth.json") }
    static func clearAuth() { try? FileManager.default.removeItem(at: dir.appendingPathComponent("auth.json")) }

    static func loadAccounts() -> [String: String] { read([String: String].self, from: "accounts.json") ?? [:] }
    static func saveAccounts(_ a: [String: String]) { write(a, to: "accounts.json") }

    static func loadUserData(uid: String) -> UserData? { read(UserData.self, from: "userdata-\(uid).json") }
    static func saveUserData(_ d: UserData, uid: String) { write(d, to: "userdata-\(uid).json") }

    struct GlobalData: Codable {
        var itemDeltas: [String: Double] = [:]
        var wordStats: [String: WordStat] = [:]
        var reports: [String: [WordReport]] = [:]
    }

    static func loadGlobal() -> GlobalData { read(GlobalData.self, from: "global.json") ?? GlobalData() }
    static func saveGlobal(itemDeltas: [String: Double], wordStats: [String: WordStat], reports: [String: [WordReport]]) {
        write(GlobalData(itemDeltas: itemDeltas, wordStats: wordStats, reports: reports), to: "global.json")
    }
}
