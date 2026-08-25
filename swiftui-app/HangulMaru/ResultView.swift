import SwiftUI

/// 세션 완료 화면 — "오늘의 미션 완료!"
struct ResultView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                HarangFigure(pose: .party,
                             scarfColor: Color(hex: store.data.scarfColor),
                             size: 190)
                    .padding(.top, 8)

                Text("🎉 오늘의 미션 완료!")
                    .font(.system(size: 24, weight: .heavy))
                    .foregroundStyle(HM.green)
                    .padding(.top, 4)

                // 2×2 통계 그리드
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())],
                          spacing: 10) {
                    resultCard(label: "오늘 학습한 단어", labelColor: HM.textSecondary,
                               value: "\(store.completedQuestions)개", valueColor: HM.greenDeep,
                               bg: HM.bgSubtle, border: HM.border)
                    resultCard(label: "지혜 조각 (재화)", labelColor: HM.skyText,
                               value: "+\(store.sessionBlueShards)", valueColor: HM.skyText,
                               bg: HM.infoSoft, border: HM.infoBorder)
                    resultCard(label: "연속 학습", labelColor: HM.textSecondary,
                               value: "\(store.data.streak)일차", valueColor: HM.amberDeep,
                               bg: HM.bgSubtle, border: HM.border)
                    resultCard(label: "새 낱말 조각", labelColor: HM.greenDeep,
                               value: "+\(store.sessionNewWords)", valueColor: HM.greenDeep,
                               bg: HM.brandMint, border: HM.mintBorder)
                }
                .frame(maxWidth: 320)
                .padding(.top, 20)

                // 어휘 지수 행
                if store.isRated {
                    altitudeRow
                        .frame(maxWidth: 320)
                        .padding(.top, 10)
                }

                Text("다시 도전한 단어: \(store.retryCount)개 · 누적 경험치: ")
                    .font(.system(size: 13))
                    .foregroundStyle(HM.textMuted)
                + Text("\(store.data.exp) EXP")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(HM.amber)

                Button {
                    store.screen = .home
                } label: {
                    Text("홈으로 돌아가기")
                }
                .buttonStyle(PrimaryButtonStyle())
                .frame(maxWidth: 320)
                .padding(.top, 20)
                .padding(.bottom, 30)
            }
            .padding(20)
            .frame(maxWidth: .infinity)
        }
        .background(HM.bg)
    }

    private var altitudeRow: some View {
        HStack {
            Text("어휘 지수")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(Color(hex: "#0f766e"))
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("해발 \(store.altitude)m · \(store.tierEmoji(store.tierName)) \(store.tierName)")
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundStyle(HM.green700)
                let delta = Int(store.sessionRatingDelta.rounded())
                if delta > 0 {
                    Text("+\(delta)m ⬆")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(HM.greenDeep)
                } else {
                    Text("고도 유지")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(HM.textMuted)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            LinearGradient(colors: [HM.brandMint, HM.infoSoft],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }

    private func resultCard(label: String, labelColor: Color, value: String, valueColor: Color,
                            bg: Color, border: Color) -> some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(labelColor)
            Text(value)
                .font(.system(size: 20, weight: .heavy))
                .foregroundStyle(valueColor)
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(bg)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(border, lineWidth: 1))
    }
}
