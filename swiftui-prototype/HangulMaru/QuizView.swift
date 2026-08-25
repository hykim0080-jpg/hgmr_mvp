import SwiftUI

struct QuizView: View {
    @Environment(WordStore.self) private var store
    @State private var showExitConfirm = false
    @FocusState private var inputFocused: Bool

    var body: some View {
        @Bindable var store = store

        VStack(spacing: 0) {
            quizHeader

            ScrollView {
                VStack(spacing: 16) {
                    if let word = store.currentWord {
                        tagChip(word)
                        sentenceCard(word)
                        meaningCard(word)
                        if store.phase != .answering {
                            feedbackBanner(word)
                        }
                    }
                }
                .padding(20)
            }

            inputBar
        }
        .background(Color.white)
        .confirmationDialog("학습을 그만할까요?", isPresented: $showExitConfirm, titleVisibility: .visible) {
            Button("홈으로", role: .destructive) { store.goHome() }
            Button("계속 풀기", role: .cancel) {}
        }
    }

    // MARK: - 퀴즈 헤더 행

    private var quizHeader: some View {
        HStack(spacing: 12) {
            Button {
                showExitConfirm = true
            } label: {
                Image(systemName: "xmark")
                    .font(.body.weight(.bold))
                    .foregroundStyle(HM.sub)
            }

            ProgressView(value: Double(store.currentIndex + (store.phase == .answering ? 0 : 1)),
                         total: Double(store.session.count))
                .tint(HM.teal)

            Text("\(store.currentIndex + 1) / \(store.session.count)")
                .font(.footnote.weight(.bold))
                .foregroundStyle(HM.sub)
                .monospacedDigit()
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
    }

    // MARK: - 문제 영역

    private func tagChip(_ word: Word) -> some View {
        HStack {
            Text(word.tagLabel)
                .font(.caption.weight(.bold))
                .foregroundStyle(HM.tealDeep)
                .padding(.horizontal, 12)
                .padding(.vertical, 5)
                .background(HM.mint)
                .clipShape(Capsule())
            Spacer()
        }
    }

    /// 빈칸(____)이 있는 예문 — 정답 공개 후엔 빈칸이 채워짐
    private func sentenceCard(_ word: Word) -> some View {
        let parts = word.sentence.components(separatedBy: "____")
        var text = Text("")
        for (i, part) in parts.enumerated() {
            text = text + Text(part)
            if i < parts.count - 1 {
                if store.phase == .answering {
                    text = text + Text(" ◯◯ ")
                        .foregroundColor(HM.teal)
                        .fontWeight(.heavy)
                } else {
                    text = text + Text(word.target)
                        .foregroundColor(store.phase == .correct ? HM.success : HM.danger)
                        .fontWeight(.heavy)
                        .underline()
                }
            }
        }
        return text
            .font(.body)
            .lineSpacing(6)
            .foregroundStyle(HM.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
            .hmCard()
    }

    private func meaningCard(_ word: Word) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Text("Lv \(word.level)")
                .font(.caption.weight(.heavy))
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(HM.shardBlue)
                .clipShape(RoundedRectangle(cornerRadius: 6))
            Text(word.meaning)
                .font(.callout)
                .foregroundStyle(HM.ink)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .hmCard()
    }

    // MARK: - 정답/오답 피드백

    private func feedbackBanner(_ word: Word) -> some View {
        HStack(spacing: 12) {
            HarangView(size: 52, mood: store.phase == .correct ? .happy : .sad)
                .frame(width: 64, height: 60)

            VStack(alignment: .leading, spacing: 3) {
                if store.phase == .correct {
                    Text("정답이에요!")
                        .font(.headline)
                        .foregroundStyle(HM.success)
                    Text("지혜 조각 +\(store.comboStreak % 3 == 0 ? 2 : 1)  \(store.comboStreak >= 2 ? "· \(store.comboStreak)연속 🔥" : "")")
                        .font(.footnote)
                        .foregroundStyle(HM.sub)
                } else {
                    Text("아쉬워요!")
                        .font(.headline)
                        .foregroundStyle(HM.danger)
                    Text("정답: \(word.target)")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(HM.ink)
                }
            }
            Spacer()
        }
        .padding(14)
        .background(store.phase == .correct ? HM.mint : HM.danger.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .transition(.scale(scale: 0.9).combined(with: .opacity))
    }

    // MARK: - 입력줄

    private var inputBar: some View {
        @Bindable var store = store

        return HStack(spacing: 10) {
            if store.phase == .answering {
                TextField("빈칸에 들어갈 낱말은?", text: $store.answerInput)
                    .textFieldStyle(.plain)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 13)
                    .background(HM.cardBG)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .focused($inputFocused)
                    .submitLabel(.done)
                    .onSubmit { submit() }

                Button {
                    submit()
                } label: {
                    Text("제출")
                        .font(.headline)
                        .padding(.horizontal, 20)
                        .padding(.vertical, 13)
                        .background(HM.teal)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            } else {
                Button {
                    withAnimation(.spring(duration: 0.3)) {
                        store.nextQuestion()
                    }
                    inputFocused = true
                } label: {
                    Text(store.currentIndex + 1 < store.session.count ? "다음 문제" : "결과 보기")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 15)
                        .background(HM.teal)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }

    private func submit() {
        withAnimation(.spring(duration: 0.3)) {
            store.submitAnswer()
        }
    }
}

#Preview {
    let s = WordStore()
    s.startSession()
    return QuizView().environment(s)
}
