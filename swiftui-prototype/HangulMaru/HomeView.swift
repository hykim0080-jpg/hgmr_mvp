import SwiftUI

struct HomeView: View {
    @Environment(WordStore.self) private var store

    var body: some View {
        VStack(spacing: 0) {
            header

            ScrollView {
                VStack(spacing: 20) {
                    profileSection
                    statsSection
                    startButton
                }
                .padding(20)
            }
        }
        .background(Color.white)
    }

    // MARK: - 앱 헤더

    private var header: some View {
        HStack {
            // 지혜 조각 칩
            HStack(spacing: 6) {
                ShardShape()
                    .fill(HM.shardBlue)
                    .frame(width: 14, height: 17)
                Text("\(store.blueShards)")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(HM.ink)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(HM.cardBG)
            .clipShape(Capsule())

            Spacer()

            // 프로필 칩
            HStack(spacing: 6) {
                HarangView(size: 22, mood: .idle)
                    .frame(width: 26, height: 26)
                Text("탐험가")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(HM.ink)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 5)
            .background(HM.mint)
            .clipShape(Capsule())
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
    }

    // MARK: - 프로필 아바타 + 인사

    private var profileSection: some View {
        VStack(spacing: 10) {
            ZStack(alignment: .bottomTrailing) {
                Circle()
                    .fill(HM.mint)
                    .frame(width: 140, height: 140)
                    .overlay(Circle().stroke(HM.teal.opacity(0.25), lineWidth: 3))
                HarangView(size: 92, mood: .idle)
                    .frame(width: 140, height: 140)

                // 레벨 배지
                Text("Lv.\(store.level)")
                    .font(.caption.weight(.heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(HM.teal)
                    .clipShape(Capsule())
                    .offset(x: 4, y: -2)
            }

            // 주제 칩
            Text("🎯 전체")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HM.tealDeep)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)
                .background(HM.mint)
                .clipShape(Capsule())

            VStack(spacing: 2) {
                Text("낱말 탐험가")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(HM.teal)
                Text("반가워요! 오늘도 어휘를 모아볼까요?")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(HM.ink)
                    .multilineTextAlignment(.center)
            }
        }
    }

    // MARK: - 학습 분석 요약 피드

    private var statsSection: some View {
        VStack(spacing: 12) {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                statCard(icon: "🔥", title: "연속 학습", value: "\(store.streakDays)일")
                statCard(icon: "📚", title: "학습 어휘", value: "\(store.learnedWords.count)개")
                statCard(icon: "🎯", title: "평균 정답률", value: "\(store.accuracy)%")
                statCard(icon: "💎", title: "지혜 조각", value: "\(store.blueShards)개")
            }

            // 레벨 진척도 바
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("레벨 진척도")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(HM.sub)
                    Spacer()
                    Text("\(store.exp) / \(WordStore.expPerLevel) EXP")
                        .font(.footnote.weight(.bold))
                        .foregroundStyle(HM.tealDeep)
                }
                ProgressView(value: Double(store.exp), total: Double(WordStore.expPerLevel))
                    .tint(HM.teal)
                    .scaleEffect(y: 1.8, anchor: .center)
            }
            .hmCard()
        }
    }

    private func statCard(icon: String, title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(icon).font(.title3)
            Text(value)
                .font(.title3.weight(.heavy))
                .foregroundStyle(HM.ink)
            Text(title)
                .font(.caption)
                .foregroundStyle(HM.sub)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .hmCard()
    }

    // MARK: - 학습 시작 버튼

    private var startButton: some View {
        Button {
            store.startSession()
        } label: {
            Text("오늘의 학습 시작하기 (\(WordStore.sessionSize)개)")
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 17)
                .background(
                    LinearGradient(colors: [HM.teal, HM.tealDeep],
                                   startPoint: .top, endPoint: .bottom)
                )
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: HM.teal.opacity(0.35), radius: 10, y: 5)
        }
        .disabled(store.words.isEmpty)
    }
}

#Preview {
    HomeView().environment(WordStore())
}
