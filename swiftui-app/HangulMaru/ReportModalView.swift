import SwiftUI

/// 단어 신고 모달
struct ReportModalView: View {
    @Environment(AppStore.self) private var store
    @State private var reason: String? = nil
    @State private var detail = ""

    private let reasons = ["오타·맞춤법", "예문이 어색해요", "뜻이 잘못됐어요", "정답 인정 문제", "기타"]

    private var word: Word? { store.displayWord }
    private var answerRevealed: Bool { store.phase != .answering }

    var body: some View {
        CenterModal(maxWidth: 360, onDismiss: { store.showReportModal = false }) {
            VStack(alignment: .leading, spacing: 14) {
                Text("🚩 단어 신고")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)
                    .frame(maxWidth: .infinity)

                (Text("문제에 오류가 있나요?\n신고 내용은 ")
                 + Text("관리자가 직접 검토").bold()
                 + Text("해서 문제를 고치는 데 사용돼요."))
                    .font(.system(size: 12))
                    .foregroundStyle(HM.textSecondary)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)

                // 대상 박스 — 정답 미공개 시 target 숨김 (정답 유출 방지)
                if let word {
                    VStack(alignment: .leading, spacing: 6) {
                        if answerRevealed {
                            Text(word.target)
                                .font(.system(size: 16, weight: .heavy))
                                .foregroundStyle(HM.textPrimary)
                            Text(word.sentence.replacingOccurrences(of: "____", with: "[\(word.stem)]"))
                                .font(.system(size: 12))
                                .foregroundStyle(HM.textSub)
                        } else {
                            Text(word.meaning)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundStyle(HM.textPrimary)
                            Text(word.sentence)
                                .font(.system(size: 12))
                                .foregroundStyle(HM.textSub)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(HM.bgSubtle)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                Text("어떤 문제인가요?")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(HM.textSub)

                FlowChips(spacing: 8) {
                    ForEach(reasons, id: \.self) { r in
                        let selected = reason == r
                        Button {
                            reason = selected ? nil : r
                        } label: {
                            Text(r)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(selected ? HM.red : HM.textSub)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 7)
                                .background(selected ? HM.dangerBG : HM.bgSubtle)
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(selected ? HM.red : HM.border, lineWidth: 1.5))
                        }
                    }
                }

                TextField("자세한 내용을 적어 주시면 검토에 큰 도움이 돼요 (선택)", text: $detail, axis: .vertical)
                    .font(.system(size: 13))
                    .lineLimit(3...5)
                    .padding(12)
                    .background(HM.bgSubtle)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.border, lineWidth: 1))

                HStack(spacing: 10) {
                    Button {
                        store.showReportModal = false
                    } label: {
                        Text("취소")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(HM.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(HM.bgMuted)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    Button {
                        if let word { store.submitReport(word: word, reason: reason, detail: detail) }
                    } label: {
                        Text("신고 제출")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 13)
                            .background(HM.red)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .frame(maxWidth: .infinity)
                }

                if let word, store.data.flaggedWords[word.target] != nil {
                    Button {
                        store.unflagWord(word.target)
                    } label: {
                        Text("이 단어의 내 신고 표시 해제")
                            .font(.system(size: 12))
                            .foregroundStyle(HM.textSecondary)
                            .underline()
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }
}
