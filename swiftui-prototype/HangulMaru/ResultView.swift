import SwiftUI

struct ResultView: View {
    @Environment(WordStore.self) private var store

    private var sessionAccuracy: Int {
        store.session.isEmpty ? 0 : Int(Double(store.sessionCorrect) / Double(store.session.count) * 100)
    }

    var body: some View {
        ZStack {
            HM.mint.ignoresSafeArea()

            VStack(spacing: 24) {
                Spacer()

                HarangView(size: 160, mood: .party)

                Text("오늘 학습 완료!")
                    .font(.largeTitle.weight(.heavy))
                    .foregroundStyle(HM.ink)

                HStack(spacing: 12) {
                    resultCard(value: "\(store.sessionCorrect) / \(store.session.count)", label: "정답")
                    resultCard(value: "\(sessionAccuracy)%", label: "정답률")
                    resultCard(value: "+\(store.sessionShards)", label: "지혜 조각")
                }
                .padding(.horizontal, 24)

                Spacer()

                Button {
                    store.goHome()
                } label: {
                    Text("홈으로")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(HM.teal)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
    }

    private func resultCard(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.weight(.heavy))
                .foregroundStyle(HM.tealDeep)
                .monospacedDigit()
            Text(label)
                .font(.caption)
                .foregroundStyle(HM.sub)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 6, y: 3)
    }
}

#Preview {
    ResultView().environment(WordStore())
}
