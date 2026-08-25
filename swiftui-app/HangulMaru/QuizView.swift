import SwiftUI

struct QuizView: View {
    @Environment(AppStore.self) private var store
    @State private var shakeOffset: CGFloat = 0
    @State private var showGain = false

    private var word: Word? { store.displayWord }
    private var showStatsPanel: Bool {
        !store.isPlacement && store.phase != .answering
    }

    var body: some View {
        VStack(spacing: 0) {
            ZStack(alignment: .topTrailing) {
                VStack(alignment: .leading, spacing: 0) {
                    headerRow
                    tagChipRow
                        .padding(.top, 24)
                    if let word {
                        sentenceView(word)
                            .padding(.top, 10)
                        meaningView(word)
                            .padding(.top, 14)
                    }
                    Spacer(minLength: 8)
                    inputRow
                        .padding(.bottom, 12)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                flagButton
                    .padding(.trailing, 16)
                    .padding(.top, 12)
            }
            .frame(maxHeight: .infinity)

            // 키보드 ↔ 통계 패널 (같은 슬롯)
            bottomSlot
        }
        .background(HM.bg)
        .onChange(of: store.wrongFlashTrigger) {
            shake()
        }
        .onChange(of: store.phase) { _, newPhase in
            if case .correct = newPhase { triggerGain() }
            if case .synonym = newPhase { triggerGain() }
        }
    }

    // MARK: - 헤더 행

    private var headerRow: some View {
        HStack(spacing: 12) {
            Button {
                store.showExitConfirm = true
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(HM.textSecondary)
                    .frame(width: 34, height: 34)
                    .background(HM.bgMuted)
                    .clipShape(Circle())
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(HM.border)
                    Capsule().fill(HM.green)
                        .frame(width: geo.size.width * progressRatio)
                        .animation(.easeOut(duration: 0.3), value: progressRatio)
                }
            }
            .frame(height: 6)

            Text("\(store.completedQuestions)/\(store.dailyTarget)")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(HM.textSecondary)
                .monospacedDigit()
                .frame(minWidth: 42, alignment: .trailing)
        }
        .padding(.trailing, 44)
    }

    private var progressRatio: CGFloat {
        guard store.dailyTarget > 0 else { return 0 }
        return min(1, CGFloat(store.completedQuestions) / CGFloat(store.dailyTarget))
    }

    // MARK: - 신고 버튼

    private var flagButton: some View {
        let flagged = word.map { store.data.flaggedWords[$0.target] != nil } ?? false
        return Button {
            store.showReportModal = true
        } label: {
            Image(systemName: flagged ? "checkmark" : "flag")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(flagged ? Color(hex: "#a16207") : HM.textSecondary)
                .frame(width: 36, height: 36)
                .background(flagged ? Color(hex: "#fef08a") : HM.bgSubtle)
                .clipShape(Circle())
                .overlay(Circle().stroke(flagged ? Color(hex: "#eab308") : HM.border, lineWidth: 1))
        }
        .disabled(store.isPlacement)
        .opacity(store.isPlacement ? 0 : 1)
    }

    // MARK: - 태그 칩

    @ViewBuilder private var tagChipRow: some View {
        HStack(spacing: 6) {
            if let item = store.displayItem {
                if item.synRetry {
                    situationBadge("유의어 재도전", color: HM.blue)
                } else if item.reinserted {
                    situationBadge("재도전", color: Color(hex: "#f43f5e"))
                } else if item.isReview {
                    situationBadge("복습", color: HM.amber)
                }
            }
            if let word, let tag = word.tags.first, tag != "기초" {
                Text(tag.replacingOccurrences(of: "_", with: "/"))
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(HM.indigo)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2.5)
                    .background(HM.indigoBG)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                    .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(hex: "#c4b5fd"), lineWidth: 1))
            }
            Spacer()
        }
        .frame(minHeight: 22)
    }

    private func situationBadge(_ label: String, color: Color) -> some View {
        Text(label)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    // MARK: - 문장

    private func sentenceView(_ word: Word) -> some View {
        let parts = word.sentence.components(separatedBy: "____")
        let fontSize: CGFloat = word.sentence.count > 90 ? 18 : (word.sentence.count > 60 ? 20 : 22)

        var text = Text("")
        for (i, part) in parts.enumerated() {
            text = text + Text(part)
            if i < parts.count - 1 {
                switch store.phase {
                case .answering:
                    text = text + Text("____")
                        .foregroundColor(HM.textMuted)
                        .underline(pattern: .dash, color: HM.borderStrong)
                case .correct:
                    text = text + Text(word.stem).foregroundColor(HM.green).fontWeight(.heavy)
                case .synonym:
                    text = text + Text(word.stem).foregroundColor(HM.blue).fontWeight(.heavy)
                case .revealed:
                    text = text + Text(word.stem).foregroundColor(HM.red).fontWeight(.heavy).underline()
                }
                // 용언 어미는 빈칸 바로 뒤에 일반 텍스트로 표시 (예: "____하다")
                if !word.suffix.isEmpty {
                    text = text + Text(word.suffix)
                }
            }
        }
        return text
            .font(.system(size: fontSize, weight: .bold))
            .foregroundStyle(HM.textPrimary)
            .lineSpacing(fontSize * 0.35)
            .frame(maxWidth: .infinity, minHeight: 90, alignment: .topLeading)
            .fixedSize(horizontal: false, vertical: true)
    }

    // MARK: - 뜻풀이

    private func meaningView(_ word: Word) -> some View {
        let fontSize: CGFloat = word.meaning.count > 40 ? 13 : (word.meaning.count > 25 ? 14 : 15)
        return HStack(alignment: .top, spacing: 8) {
            Text("Lv.\(word.level)")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(HM.blue)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            Text(word.meaning)
                .font(.system(size: fontSize))
                .foregroundStyle(HM.textSecondary)
                .lineSpacing(4)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(12)
        .background(HM.bgSubtle)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - 입력줄

    private var inputRow: some View {
        ZStack(alignment: .topTrailing) {
            HStack(spacing: 12) {
                if store.phase == .answering {
                    Button {
                        store.revealAnswer()
                    } label: {
                        Text("정답 보기")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 70, height: 52)
                            .background(HM.textMuted)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }

                inputDisplay
                    .offset(x: shakeOffset)

                if showStatsPanel || store.isPlacement && store.phase != .answering {
                    // 다음 버튼은 통계 패널 하단에 (모바일 스타일)
                }
            }

            companion
                .offset(x: -8, y: -54)
        }
    }

    private var inputDisplay: some View {
        Group {
            switch store.phase {
            case .answering:
                Text(store.answerInput.isEmpty ? "정답 입력" : store.answerInput)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(store.answerInput.isEmpty ? HM.textMuted : HM.textPrimary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(HM.bg)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.borderStrong, lineWidth: 2))
            case .correct:
                Text(word?.stem ?? "")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(HM.green700)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(HM.brandMint)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.green, lineWidth: 2))
            case .synonym(let input):
                Text("\(input) (정답: \(word?.stem ?? ""))")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(HM.blueDeep)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(HM.infoBG)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.blue, lineWidth: 2))
            case .revealed:
                Text(word?.stem ?? "")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(HM.redDeep)
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(HM.dangerBG)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.red, lineWidth: 2))
            }
        }
    }

    // MARK: - 하랑이 컴패니언

    private var companion: some View {
        ZStack(alignment: .trailing) {
            // 말풍선
            if let bubble = store.harangBubble {
                Text(bubble)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(store.harangBubbleColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(HM.surface)
                    .clipShape(UnevenRoundedRectangle(topLeadingRadius: 14, bottomLeadingRadius: 14,
                                                      bottomTrailingRadius: 4, topTrailingRadius: 14))
                    .overlay(
                        UnevenRoundedRectangle(topLeadingRadius: 14, bottomLeadingRadius: 14,
                                               bottomTrailingRadius: 4, topTrailingRadius: 14)
                            .stroke(HM.borderStrong, lineWidth: 1.5)
                    )
                    .fixedSize()
                    .offset(x: -60, y: -6)
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
            }

            // 조각 획득 스프라이트
            if showGain {
                HStack(spacing: 6) {
                    HStack(spacing: 3) {
                        ShardIcon(kind: .blue, size: 15)
                        Text("+\(store.lastGainBlue)")
                            .font(.system(size: 13, weight: .heavy))
                            .foregroundStyle(HM.skyText)
                    }
                    if store.lastGainGreen {
                        HStack(spacing: 3) {
                            ShardIcon(kind: .green, size: 15)
                            Text("+1")
                                .font(.system(size: 13, weight: .heavy))
                                .foregroundStyle(HM.greenDeep)
                        }
                    }
                }
                .offset(y: -46)
                .transition(.asymmetric(
                    insertion: .offset(y: 12).combined(with: .opacity),
                    removal: .offset(y: -20).combined(with: .opacity)))
            }

            // 하랑이
            Group {
                switch store.harangMood {
                case .clap:
                    HarangFigure(pose: .clap, scarfColor: Color(hex: store.data.scarfColor), size: 56)
                case .wrong:
                    HarangFigure(pose: .aw, scarfColor: Color(hex: store.data.scarfColor), size: 56)
                default:
                    BobbingMiniHarang()
                }
            }
        }
        .animation(.easeOut(duration: 0.2), value: store.harangBubble)
    }

    private func triggerGain() {
        withAnimation(.easeOut(duration: 0.3)) { showGain = true }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(1700))
            withAnimation(.easeIn(duration: 0.3)) { showGain = false }
        }
    }

    private func shake() {
        let seq: [CGFloat] = [-4, 4, -3, 3, -2, 2, 0]
        Task { @MainActor in
            for v in seq {
                withAnimation(.linear(duration: 0.055)) { shakeOffset = v }
                try? await Task.sleep(for: .milliseconds(55))
            }
        }
    }

    // MARK: - 하단 슬롯 (키보드 ↔ 통계 패널)

    @ViewBuilder private var bottomSlot: some View {
        if store.phase == .answering {
            JamoKeyboardView(
                onJamo: { store.answerInput = HangulComposer.input($0, into: store.answerInput) },
                onBackspace: { store.answerInput = HangulComposer.backspace(store.answerInput) },
                onSpace: { store.answerInput += " " },
                onSubmit: { store.submitAnswer() }
            )
            .transition(.move(edge: .bottom).combined(with: .opacity))
        } else if store.isPlacement {
            // 배치고사: 900ms 후 자동 진행 — 간단 피드백 바만
            placementFeedback
        } else {
            statsPanel
                .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }

    private var placementFeedback: some View {
        HStack {
            Spacer()
            if store.phase == .correct {
                Label("정답이에요!", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(HM.green)
            } else {
                Label("다음 문제로 넘어갈게요", systemImage: "arrow.right.circle.fill")
                    .foregroundStyle(HM.textSecondary)
            }
            Spacer()
        }
        .font(.system(size: 15, weight: .bold))
        .padding(.vertical, 28)
        .background(HM.bgSubtle)
    }

    // MARK: - 오답 통계 패널

    private var statsPanel: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("사람들은 이 문장을 어떻게 완성했을까요?")
                .font(.system(size: 16, weight: .heavy))
                .foregroundStyle(HM.textPrimary)
                .padding(.bottom, 12)

            HStack {
                Text("표현")
                Spacer()
                Text("비율")
            }
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(HM.textSecondary)
            .padding(.bottom, 8)
            .overlay(alignment: .bottom) {
                Rectangle().fill(HM.borderStrong).frame(height: 2)
            }

            ScrollView {
                VStack(spacing: 10) {
                    if store.statsPanelRows.isEmpty {
                        Text("아직 통계 데이터가 없어요.")
                            .font(.system(size: 13))
                            .foregroundStyle(HM.textMuted)
                            .padding(.top, 16)
                    } else {
                        let total = store.statsPanelRows.reduce(0) { $0 + $1.count }
                        ForEach(store.statsPanelRows, id: \.answer) { row in
                            statRow(row, total: total)
                        }
                    }
                }
                .padding(.top, 10)
            }

            Button {
                store.nextQuestion()
            } label: {
                Text(store.quizQueue.isEmpty ? "결과 보기" : "다음 ➔")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(HM.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.top, 8)
        }
        .padding(.horizontal, 20)
        .padding(.top, 20)
        .padding(.bottom, 8)
        .frame(height: 330)
        .background(HM.bgSubtle)
        .clipShape(UnevenRoundedRectangle(topLeadingRadius: 26, topTrailingRadius: 26))
        .overlay(alignment: .top) {
            UnevenRoundedRectangle(topLeadingRadius: 26, topTrailingRadius: 26)
                .stroke(HM.borderStrong, lineWidth: 1)
        }
    }

    private func statRow(_ row: (answer: String, count: Int), total: Int) -> some View {
        guard let word else { return AnyView(EmptyView()) }
        let badge = store.statBadge(for: row.answer, word: word)
        let rate = total > 0 ? Int((Double(row.count) / Double(total) * 100).rounded()) : 0
        let barColor: Color = badge.isCorrect ? HM.green : (badge.isSynonym ? HM.blue : Color(hex: "#94a3b8"))

        return AnyView(
            HStack(spacing: 8) {
                Text(row.answer)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(HM.textPrimary)
                    .lineLimit(1)

                Text(badge.label)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(badge.isCorrect ? HM.green700 : (badge.isSynonym ? HM.blueDeep : HM.textSub))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(badge.isCorrect ? Color(hex: "#d1fae5") : (badge.isSynonym ? Color(hex: "#dbeafe") : HM.border))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Spacer()

                Capsule()
                    .fill(barColor)
                    .frame(width: max(8, CGFloat(rate) / 100 * 150), height: 10)

                Text("\(rate)%")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(HM.textSecondary)
                    .monospacedDigit()
                    .frame(width: 40, alignment: .trailing)
            }
        )
    }
}

/// idle 컴패니언 (2.8s 부유)
private struct BobbingMiniHarang: View {
    @State private var bob = false

    var body: some View {
        MiniHarangFace(size: 54)
            .offset(y: bob ? -3 : 0)
            .onAppear {
                withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                    bob = true
                }
            }
    }
}
