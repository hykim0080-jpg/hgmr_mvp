import SwiftUI

/// 낱말카드 모달 — 학습 어휘 4열 그리드 + 상세 뷰
struct VocabModalView: View {
    @Environment(AppStore.self) private var store
    @State private var selected: (word: Word, entry: LearnedEntry)? = nil

    var body: some View {
        CenterModal(maxWidth: 320, onDismiss: { store.showVocabModal = false }) {
            VStack(spacing: 14) {
                HStack {
                    Button {
                        store.showVocabModal = false
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(HM.textSecondary)
                            .frame(width: 28, height: 28)
                            .background(HM.bgMuted)
                            .clipShape(Circle())
                    }
                    Spacer()
                }

                Text("🗂 학습한 어휘")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)

                let mastered = store.masteredWords

                if let sel = selected {
                    detailView(sel)
                } else if mastered.isEmpty {
                    Text("아직 학습한 단어가 없어요.\n오늘의 학습을 시작해 보세요! 🌱")
                        .font(.system(size: 13))
                        .foregroundStyle(HM.textMuted)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 24)
                } else {
                    Text("지금까지 \(mastered.count)개의 단어를 학습했어요 · 카드를 누르면 뜻이 보여요")
                        .font(.system(size: 11))
                        .foregroundStyle(HM.textMuted)

                    ScrollView {
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 4),
                                  spacing: 6) {
                            ForEach(mastered, id: \.word.target) { item in
                                Button {
                                    selected = item
                                } label: {
                                    VStack(spacing: 2) {
                                        Text(item.word.target)
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundStyle(HM.textPrimary)
                                            .lineLimit(1)
                                            .minimumScaleFactor(0.7)
                                        Text("\(item.entry.c)회")
                                            .font(.system(size: 10))
                                            .foregroundStyle(HM.greenDeep)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(HM.bgSubtle)
                                    .clipShape(RoundedRectangle(cornerRadius: 10))
                                    .overlay(RoundedRectangle(cornerRadius: 10).stroke(HM.border, lineWidth: 1))
                                }
                            }
                        }
                    }
                    .frame(maxHeight: 380)
                }
            }
        }
    }

    private func detailView(_ item: (word: Word, entry: LearnedEntry)) -> some View {
        VStack(spacing: 14) {
            HStack(spacing: 6) {
                pill("정답 \(item.entry.c)회", bg: HM.brandMint, fg: HM.greenDeep)
                if item.entry.w > 0 {
                    pill("오답 \(item.entry.w)회", bg: HM.dangerBG, fg: Color(hex: "#dc2626"))
                }
                if let n = item.entry.n {
                    pill("복습 \(String(n.dropFirst(5)).replacingOccurrences(of: "-", with: "/"))",
                         bg: HM.infoSoft, fg: HM.skyText)
                }
            }

            Text(item.word.target)
                .font(.system(size: 32, weight: .heavy))
                .foregroundStyle(HM.textPrimary)

            Text(item.word.meaning)
                .font(.system(size: 16))
                .foregroundStyle(HM.textBody)
                .multilineTextAlignment(.center)

            if !item.word.synonyms.isEmpty {
                Text("유의어: \(item.word.synonyms.joined(separator: ", "))")
                    .font(.system(size: 13))
                    .foregroundStyle(HM.textMuted)
            }

            Button {
                selected = nil
            } label: {
                Text("← 목록으로")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(HM.indigoDeep)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(HM.indigoBG)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding(.vertical, 8)
    }

    private func pill(_ text: String, bg: Color, fg: Color) -> some View {
        Text(text)
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(fg)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(bg)
            .clipShape(Capsule())
    }
}
