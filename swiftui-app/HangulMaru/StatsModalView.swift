import SwiftUI

/// 상세 통계 모달 — 나의 학습 분석 (요약 칩 6종 + 차트 3종)
struct StatsModalView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        CenterModal(maxWidth: 420, onDismiss: { store.showStatsModal = false }) {
            VStack(spacing: 16) {
                Text("📊 나의 학습 분석")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)

                ScrollView {
                    VStack(spacing: 16) {
                        summaryChips
                        chartCard("⛰ 어휘 고도 추이") { altitudeChart }
                        chartCard("📅 최근 14일 학습 활동") { activityChart }
                        chartCard("🧠 기억 단계 분포") { srsChart }
                    }
                }
                .frame(maxHeight: 480)

                Button {
                    store.showStatsModal = false
                } label: {
                    Text("닫기")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(HM.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(HM.bgMuted)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    // MARK: - 요약 칩 6종

    private var summaryChips: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
            chip("어휘 고도",
                 value: store.isRated ? "해발 \(store.altitude)m" : "측정 전",
                 sub: store.isRated ? "\(store.tierEmoji(store.tierName)) \(store.tierName)" : nil,
                 color: HM.green700)
            chip("평균 정답률", value: store.accuracyText, sub: "첫 시도 기준", color: Color(hex: "#2563eb"))
            chip("누적 학습 어휘", value: "\(store.learnedVal)개", sub: "오늘 +\(store.todayLearnedCount)", color: HM.greenDeep)
            chip("연속 학습", value: "\(store.data.streak)일차", sub: "총 출석 \(store.attendanceDates.count)일", color: HM.amberDeep)
            chip("현재 레벨", value: "Lv.\(store.level)", sub: "\(store.data.exp) EXP", color: Color(hex: "#7c3aed"))
            chip("달성 업적", value: "\(Badges.count(store.data)) / 5", sub: nil, color: Color(hex: "#dc2626"))
        }
    }

    private func chip(_ label: String, value: String, sub: String?, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label)
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(HM.textSecondary)
            Text(value)
                .font(.system(size: 17, weight: .heavy))
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if let sub {
                Text(sub)
                    .font(.system(size: 10))
                    .foregroundStyle(HM.textMuted)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(HM.bgSubtle)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(HM.border, lineWidth: 1))
    }

    private func chartCard(_ title: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(HM.textSub)
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(HM.bgSubtle)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(HM.border, lineWidth: 1))
    }

    // MARK: - 어휘 고도 추이 (영역 그래프)

    private var altitudeChart: some View {
        // 최근 30개, 누적 최고점 변환 후 altitude
        let recent = store.data.ratingHistory.suffix(30)
        var peak: Double = 0
        let points: [Double] = recent.map { p in
            peak = max(peak, p.r)
            return max(0, peak - 800)
        }

        return Group {
            if points.count < 2 {
                Text("데이터가 쌓이면 고도 변화가 표시돼요.")
                    .font(.system(size: 12))
                    .foregroundStyle(HM.textMuted)
                    .frame(maxWidth: .infinity, minHeight: 60)
            } else {
                GeometryReader { geo in
                    let minV = points.min()!
                    let maxV = points.max()!
                    let range = max(40, maxV - minV)
                    let lo = minV - (range - (maxV - minV)) / 2
                    let w = geo.size.width, h = geo.size.height
                    let step = w / CGFloat(points.count - 1)
                    let y: (Double) -> CGFloat = { v in
                        h - CGFloat((v - lo) / range) * (h - 14) - 7
                    }

                    ZStack(alignment: .topTrailing) {
                        // 영역
                        Path { p in
                            p.move(to: CGPoint(x: 0, y: h))
                            for (i, v) in points.enumerated() {
                                p.addLine(to: CGPoint(x: CGFloat(i) * step, y: y(v)))
                            }
                            p.addLine(to: CGPoint(x: w, y: h))
                            p.closeSubpath()
                        }
                        .fill(
                            LinearGradient(colors: [HM.green.opacity(0.35), HM.green.opacity(0.02)],
                                           startPoint: .top, endPoint: .bottom)
                        )
                        // 선
                        Path { p in
                            for (i, v) in points.enumerated() {
                                let pt = CGPoint(x: CGFloat(i) * step, y: y(v))
                                if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
                            }
                        }
                        .stroke(HM.green, style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                        // 끝점
                        Circle()
                            .fill(HM.greenDeep)
                            .frame(width: 7, height: 7)
                            .position(x: w, y: y(points.last!))

                        Text("해발 \(Int(points.last!))m")
                            .font(.system(size: 11, weight: .heavy))
                            .foregroundStyle(HM.green700)
                    }
                }
                .frame(height: 90)
            }
        }
    }

    // MARK: - 최근 14일 학습 활동 (막대)

    private var activityChart: some View {
        let today = DateUtil.todayString()
        let days: [(String, Int)] = (0..<14).reversed().map { offset in
            let d = DateUtil.addDays(-offset, to: today)
            let count = store.data.learnedWords.values.filter { $0.d == d }.count
            return (d, count)
        }
        let maxCount = max(1, days.map(\.1).max() ?? 1)

        return HStack(alignment: .bottom, spacing: 4) {
            ForEach(days, id: \.0) { item in
                let (day, count) = item
                VStack(spacing: 3) {
                    if count > 0 && (count == maxCount || day == today) {
                        Text("\(count)")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(HM.greenDeep)
                    }
                    RoundedRectangle(cornerRadius: 3)
                        .fill(count == 0 ? AnyShapeStyle(HM.bgMuted)
                              : day == today ? AnyShapeStyle(HM.greenDeep)
                              : AnyShapeStyle(HM.shardGreenLight))
                        .frame(height: max(6, CGFloat(count) / CGFloat(maxCount) * 56))
                    Text(String(day.suffix(2)))
                        .font(.system(size: 8))
                        .foregroundStyle(HM.textMuted)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .frame(height: 90, alignment: .bottom)
    }

    // MARK: - 기억 단계 분포 (누적 가로 막대)

    private var srsChart: some View {
        let labels = ["1일", "3일", "7일", "14일", "30일"]
        let colors = ["#f87171", "#fbbf24", "#a3e635", "#34d399", "#059669"].map { Color(hex: $0) }
        let counts: [Int] = (0...4).map { s in
            store.data.learnedWords.values.filter { $0.s == s }.count
        }
        let total = counts.reduce(0, +)

        return VStack(alignment: .leading, spacing: 10) {
            if total == 0 {
                Text("학습한 단어가 쌓이면 표시돼요.")
                    .font(.system(size: 12))
                    .foregroundStyle(HM.textMuted)
            } else {
                GeometryReader { geo in
                    HStack(spacing: 1) {
                        ForEach(0...4, id: \.self) { s in
                            if counts[s] > 0 {
                                Rectangle()
                                    .fill(colors[s])
                                    .frame(width: geo.size.width * CGFloat(counts[s]) / CGFloat(total))
                            }
                        }
                    }
                    .clipShape(Capsule())
                }
                .frame(height: 14)

                FlowChips(spacing: 10) {
                    ForEach(0...4, id: \.self) { s in
                        HStack(spacing: 4) {
                            Circle().fill(colors[s]).frame(width: 8)
                            Text("\(labels[s]) \(counts[s])")
                                .font(.system(size: 10))
                                .foregroundStyle(HM.textSub)
                        }
                    }
                }
            }
        }
    }
}
