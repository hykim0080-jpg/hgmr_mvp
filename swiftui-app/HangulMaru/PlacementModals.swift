import SwiftUI

// MARK: - 배치고사 안내 모달

struct PlacementIntroModalView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        CenterModal(maxWidth: 330) {
            VStack(spacing: 14) {
                HarangFigure(pose: .idle, scarfColor: Color(hex: store.data.scarfColor), size: 120)

                Text("하랑이가 네 어휘 실력을\n알아볼게요!")
                    .font(.system(size: 19, weight: .black))
                    .foregroundStyle(HM.textPrimary)
                    .multilineTextAlignment(.center)

                (Text("최대 20문제로 딱 맞는 난이도를 찾아요.\n맞힌 단어는 낱말 조각으로 남고,\n끝나면 ")
                 + Text("지혜 조각 +15").bold().foregroundColor(HM.skyText)
                 + Text("를 드려요!"))
                    .font(.system(size: 13))
                    .foregroundStyle(HM.textSecondary)
                    .multilineTextAlignment(.center)

                Button {
                    store.startPlacement()
                } label: {
                    Text("🦭 실력 알아보기 시작")
                }
                .buttonStyle(PrimaryButtonStyle())

                Button {
                    store.showPlacementIntro = false
                } label: {
                    Text("나중에 하기")
                        .font(.system(size: 13))
                        .foregroundStyle(HM.textMuted)
                        .underline()
                }
            }
        }
    }
}

// MARK: - 배치고사 결과 모달

struct PlacementResultModalView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        CenterModal(maxWidth: 330) {
            VStack(spacing: 14) {
                HarangFigure(pose: .party, scarfColor: Color(hex: store.data.scarfColor), size: 140)

                Text("측정 완료!")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(HM.textSecondary)

                Text("\(store.tierEmoji(store.tierName)) \(store.tierName)")
                    .font(.system(size: 30, weight: .black))
                    .foregroundStyle(HM.green700)

                (Text("어휘 고도 ") + Text("해발 \(store.altitude)m").bold())
                    .font(.system(size: 15))
                    .foregroundStyle(HM.textPrimary)

                Text("여기가 너의 시작 고도예요.\n이제 하랑이와 함께 마루(1,100m)까지 올라가요!")
                    .font(.system(size: 13))
                    .foregroundStyle(HM.textSecondary)
                    .multilineTextAlignment(.center)

                HStack(spacing: 6) {
                    ShardIcon(kind: .blue, size: 16)
                    Text("지혜 조각 +15 획득!")
                        .font(.system(size: 13, weight: .heavy))
                        .foregroundStyle(HM.skyText)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(HM.infoSoft)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(HM.infoBorder, lineWidth: 1))

                Button {
                    store.showPlacementResult = false
                } label: {
                    Text("학습 시작하러 가기")
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
    }
}

// MARK: - 어휘 고도 안내 모달

struct AltitudeGuideModalView: View {
    @Environment(AppStore.self) private var store

    private let tiers: [(emoji: String, name: String, range: String, desc: String, color: String, bg: Color)] = [
        ("☀️", "마루", "900m~1,100m", "정상! 최고 수준의 어휘력이에요", "#b45309", HM.amberSoft),
        ("⛰", "능선", "700m~899m", "고급 어휘까지 자유자재로 다뤄요", "#475569", HM.bgSubtle),
        ("🏔", "중턱", "500m~699m", "어려운 단어에 도전하는 구간이에요", "#047857", HM.brandMint),
        ("🥾", "오르막", "300m~499m", "기초를 다지며 오르는 중이에요", "#65a30d", HM.limeSoft),
        ("🌱", "기슭", "0m~299m", "등반의 시작 — 모두 여기서 출발해요", "#0d9488", HM.tealSoft),
    ]

    var body: some View {
        CenterModal(maxWidth: 400, onDismiss: { store.showAltitudeGuide = false }) {
            VStack(spacing: 14) {
                Text("⛰ 어휘 고도란?")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)

                (Text("새로운 단어를 학습할수록 고도가 올라가요.\n한 번 오른 고도는 ")
                 + Text("절대 내려가지 않아요!").bold())
                    .font(.system(size: 13))
                    .foregroundStyle(HM.textSecondary)
                    .multilineTextAlignment(.center)

                mountainView

                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(tiers, id: \.name) { tier in
                            let isCurrent = store.isRated && store.tierName == tier.name
                            HStack(spacing: 10) {
                                Text(tier.emoji).font(.system(size: 20))
                                VStack(alignment: .leading, spacing: 1) {
                                    HStack(spacing: 6) {
                                        Text(tier.name)
                                            .font(.system(size: 14, weight: .heavy))
                                        Text(tier.range)
                                            .font(.system(size: 11))
                                            .foregroundStyle(HM.textMuted)
                                    }
                                    .foregroundStyle(Color(hex: tier.color))
                                    Text(tier.desc)
                                        .font(.system(size: 11))
                                        .foregroundStyle(HM.textSub)
                                }
                                Spacer()
                                if isCurrent {
                                    Text("현재 위치")
                                        .font(.system(size: 10, weight: .heavy))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color(hex: tier.color))
                                        .clipShape(Capsule())
                                }
                            }
                            .padding(10)
                            .background(tier.bg)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
                .frame(maxHeight: 260)

                HStack(spacing: 10) {
                    Button {
                        store.showAltitudeGuide = false
                        store.showStatsModal = true
                    } label: {
                        Text("📊 학습 분석 보기")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(HM.green700)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(HM.brandMint)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.mintBorder, lineWidth: 1))
                    }
                    Button {
                        store.showAltitudeGuide = false
                    } label: {
                        Text("닫기")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(HM.textSecondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(HM.bgMuted)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
    }

    /// 하랑이 산 (간이 버전): 초록 산 + 눈모자 + 해 + 바다 + 현재 위치 마커
    private var mountainView: some View {
        ZStack {
            // 하늘 + 바다
            VStack(spacing: 0) {
                LinearGradient(colors: [HM.infoSoft, HM.bgSubtle], startPoint: .top, endPoint: .bottom)
                LinearGradient(colors: [HM.skyLight.opacity(0.5), HM.skyText.opacity(0.5)],
                               startPoint: .top, endPoint: .bottom)
                    .frame(height: 22)
            }
            // 해
            Circle().fill(Color(hex: "#fcd34d"))
                .frame(width: 26)
                .offset(x: 110, y: -40)
            // 산
            MountainShape()
                .fill(
                    LinearGradient(colors: [Color(hex: "#4ade80"), Color(hex: "#10b981"), Color(hex: "#047857")],
                                   startPoint: .top, endPoint: .bottom)
                )
                .overlay(
                    SnowCapShape().fill(.white.opacity(0.9))
                )
            // 현재 위치 마커
            if store.isRated {
                let ratio = min(1, Double(store.altitude) / 1100)
                Text("현재 \(store.altitude)m")
                    .font(.system(size: 10, weight: .heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(HM.greenDeep)
                    .clipShape(Capsule())
                    .offset(x: 60, y: 45 - CGFloat(ratio) * 90)
            }
        }
        .frame(height: 130)
        .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

private struct MountainShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addQuadCurve(to: CGPoint(x: rect.width * 0.42, y: rect.height * 0.14),
                       control: CGPoint(x: rect.width * 0.22, y: rect.height * 0.62))
        p.addQuadCurve(to: CGPoint(x: rect.width * 0.55, y: rect.height * 0.2),
                       control: CGPoint(x: rect.width * 0.48, y: rect.height * 0.06))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.maxY),
                       control: CGPoint(x: rect.width * 0.8, y: rect.height * 0.66))
        p.closeSubpath()
        return p
    }
}

private struct SnowCapShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.width * 0.36, y: rect.height * 0.3))
        p.addQuadCurve(to: CGPoint(x: rect.width * 0.42, y: rect.height * 0.14),
                       control: CGPoint(x: rect.width * 0.38, y: rect.height * 0.2))
        p.addQuadCurve(to: CGPoint(x: rect.width * 0.55, y: rect.height * 0.2),
                       control: CGPoint(x: rect.width * 0.48, y: rect.height * 0.06))
        p.addQuadCurve(to: CGPoint(x: rect.width * 0.6, y: rect.height * 0.32),
                       control: CGPoint(x: rect.width * 0.58, y: rect.height * 0.26))
        p.addQuadCurve(to: CGPoint(x: rect.width * 0.48, y: rect.height * 0.3),
                       control: CGPoint(x: rect.width * 0.54, y: rect.height * 0.38))
        p.addQuadCurve(to: CGPoint(x: rect.width * 0.36, y: rect.height * 0.3),
                       control: CGPoint(x: rect.width * 0.42, y: rect.height * 0.36))
        p.closeSubpath()
        return p
    }
}
