import SwiftUI

// MARK: - 앱 헤더

struct AppHeaderView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        HStack(spacing: 8) {
            // 로고 + 워드마크
            HStack(spacing: 7) {
                ShardIcon(kind: .green, showHieut: true, size: 22)
                Text("한글마루")
                    .font(.jua(21))
                    .foregroundStyle(HM.inkText)
            }

            Spacer()

            // 초록 낱말 조각 칩
            HStack(spacing: 5) {
                ShardIcon(kind: .green, size: 15)
                Text("\(store.data.totalLearnedWords)")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(HM.greenDeep)
                    .monospacedDigit()
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 6)
            .background(HM.brandMint)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(HM.mintBorder, lineWidth: 1))

            // 파란 지혜 조각 칩
            HStack(spacing: 5) {
                ShardIcon(kind: .blue, size: 15)
                Text("\(store.data.blueShards)")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundStyle(HM.skyText)
                    .monospacedDigit()
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 6)
            .background(HM.infoSoft)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(HM.infoBorder, lineWidth: 1))

            // 프로필 칩
            Button {
                store.showProfileSheet = true
            } label: {
                HStack(spacing: 6) {
                    MiniHarangFace(size: 22)
                    Text(store.data.nickname)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(HM.textPrimary)
                        .lineLimit(1)
                        .frame(maxWidth: 76)
                    Image(systemName: "pencil")
                        .font(.system(size: 10))
                        .foregroundStyle(HM.textMuted)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(HM.bgSubtle)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(HM.border, lineWidth: 1))
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(HM.surface)
        .overlay(alignment: .bottom) {
            Rectangle().fill(HM.border).frame(height: 1)
        }
    }
}

// MARK: - 홈 화면

struct HomeView: View {
    @Environment(AppStore.self) private var store
    @State private var breathe = false

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                avatarSection
                greetingSection
                feedSection
                    .padding(.top, 22)
                startButton
                    .padding(.top, 18)
                reviewDueText
                if store.isAdmin {
                    adminButton
                        .padding(.top, 10)
                }
            }
            .padding(25)
        }
        .background(HM.bg)
    }

    // MARK: 아바타

    private var avatarSection: some View {
        ZStack(alignment: .bottom) {
            Circle()
                .fill(HM.brandMint)
                .frame(width: 100, height: 100)
                .overlay(Circle().stroke(HM.surface, lineWidth: 4))
                .shadow(color: HM.green.opacity(breathe ? 0.35 : 0.25),
                        radius: breathe ? 20 : 15, y: breathe ? 8 : 5)
                .scaleEffect(breathe ? 1.04 : 1)
                .overlay(
                    HarangFigure(pose: avatarPose(store.data.avatarPose),
                                 scarfColor: Color(hex: store.data.scarfColor),
                                 size: 88, animated: false)
                )
                .onAppear {
                    withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                        breathe = true
                    }
                }
                .onTapGesture { store.showProfileSheet = true }

            Text("Lv.\(store.level)")
                .font(.system(size: 11, weight: .heavy))
                .foregroundStyle(.white)
                .padding(.horizontal, 10)
                .padding(.vertical, 3)
                .background(HM.levelBadgeGradient)
                .clipShape(Capsule())
                .shadow(color: HM.red.opacity(0.25), radius: 5, y: 4)
                .offset(y: 8)
        }
        .padding(.bottom, 8)
    }

    // MARK: 인사

    private var greetingSection: some View {
        VStack(spacing: 6) {
            // 주제 칩
            Button {
                store.showTopicModal = true
            } label: {
                let topic = Topics.topic(for: store.data.selectedTopic)
                HStack(spacing: 5) {
                    Text("🎯")
                        .font(.system(size: 13))
                    Text(topic.key == "all" ? "전체" : topic.name)
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(HM.indigoDeep)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(HM.indigoBG)
                .clipShape(Capsule())
            }
            .padding(.top, 12)

            Text(store.data.equippedTitle)
                .font(.system(size: 13, weight: .heavy))
                .foregroundStyle(HM.indigo)
                .kerning(0.5)
                .padding(.top, 8)

            if store.isRated {
                Button {
                    store.showAltitudeGuide = true
                } label: {
                    Text("\(store.tierEmoji(store.tierName)) \(store.tierName) · \(store.altitude)m")
                        .font(.system(size: 12.5, weight: .heavy))
                        .foregroundStyle(HM.green700)
                        .padding(.horizontal, 9)
                        .padding(.vertical, 3)
                        .background(HM.brandMint)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(HM.mintBorder, lineWidth: 1))
                }
            }

            Text("\(store.data.nickname)님")
                .font(.system(size: 24, weight: .heavy))
                .foregroundStyle(HM.textPrimary)

            Text("오늘도 하랑이와 지혜 조각을 모아볼까요?")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(HM.textSecondary)
        }
    }

    // MARK: 학습 분석 요약 피드

    private var feedSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("학습 분석 요약 피드")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(HM.textSub)

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible())], spacing: 12) {
                FeedStatCard(label: "연속 학습", value: "\(store.data.streak)일차", valueColor: HM.amberDeep) {
                    store.showCalendarModal = true
                }
                FeedStatCard(label: "학습 어휘", value: "\(store.learnedVal)개", valueColor: HM.greenDeep) {
                    store.showVocabModal = true
                }
                FeedStatCard(label: "평균 정답률", value: store.accuracyText, valueColor: Color(hex: "#2563eb")) {
                    store.showStatsModal = true
                }
                FeedStatCard(label: "업적 달성", value: "\(Badges.count(store.data))개", valueColor: HM.amberDeep) {
                    store.showAchievementModal = true
                }
            }

            // EXP 바
            VStack(spacing: 8) {
                Rectangle().fill(HM.borderStrong).frame(height: 1)
                HStack {
                    Text("다음 레벨 진척도")
                    Spacer()
                    Text("\(store.data.exp % 200) / 200 EXP")
                }
                .font(.system(size: 11, weight: .heavy))
                .foregroundStyle(HM.textSub)

                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Capsule().fill(HM.borderStrong)
                        Capsule().fill(HM.amber)
                            .frame(width: geo.size.width * CGFloat(store.data.exp % 200) / 200)
                            .animation(.easeOut(duration: 0.5), value: store.data.exp)
                    }
                }
                .frame(height: 6)
            }
            .padding(.top, 4)
        }
        .padding(18)
        .background(
            LinearGradient(colors: [HM.bgSubtle, HM.border], startPoint: .topLeading, endPoint: .bottomTrailing)
        )
        .clipShape(RoundedRectangle(cornerRadius: 24))
        .overlay(RoundedRectangle(cornerRadius: 24).stroke(HM.borderStrong, lineWidth: 1))
    }

    // MARK: 학습 시작

    private var startButton: some View {
        Button {
            store.startSession()
        } label: {
            Text("\(store.data.lastDate == DateUtil.todayString() ? "계속해서 학습하기" : "오늘의 학습 시작하기") (\(store.data.targetWordCount)개) ➔")
                .font(.system(size: 18, weight: .heavy))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 18)
                .background(HM.greenGradient)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: HM.green.opacity(0.3), radius: 12, y: 8)
        }
        .disabled(store.words.isEmpty)
    }

    @ViewBuilder private var reviewDueText: some View {
        let due = store.dueReviewInfo
        if due.total > 0 {
            Text(due.wrong > 0
                 ? "🔄 복습할 단어 \(due.total)개 (놓쳤던 단어 \(due.wrong)개 포함)"
                 : "🔄 복습할 단어 \(due.total)개가 기다리고 있어요")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(HM.amberDeep)
                .padding(.top, 12)
        }
    }

    private var adminButton: some View {
        Button {
            store.showAdminPanel = true
        } label: {
            Text("🔧 검토 및 수정이 필요한 단어 관리")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color(hex: "#475569"))
                .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}

// MARK: - 통계 카드

private struct FeedStatCard: View {
    var label: String
    var value: String
    var valueColor: Color
    var action: () -> Void

    @State private var pressed = false

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(HM.textSecondary)
                Text(value)
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(valueColor)
                    .monospacedDigit()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(HM.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(HM.borderStrong, lineWidth: 1))
        }
        .buttonStyle(ShrinkButtonStyle())
    }
}

struct ShrinkButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}
