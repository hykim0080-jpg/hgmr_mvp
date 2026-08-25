import SwiftUI

// MARK: - 주제 선택 모달

struct TopicModalView: View {
    @Environment(AppStore.self) private var store

    private let displayNames: [String: String] = [
        "all": "전체", "학술": "📖 학술/논리", "수능": "✏️ 수능",
        "비즈니스": "💼 경제/비즈니스", "사회": "🌐 사회/문화", "감정": "💭 감정/심리",
    ]

    var body: some View {
        CenterModal(maxWidth: 300, onDismiss: { store.showTopicModal = false }) {
            VStack(spacing: 14) {
                Text("🎯 중점 학습 주제")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)
                Text("집중하고 싶은 주제를 선택하세요")
                    .font(.system(size: 12))
                    .foregroundStyle(HM.textMuted)

                FlowChips(spacing: 8) {
                    ForEach(Topics.all) { topic in
                        let selected = store.data.selectedTopic == topic.key
                        Button {
                            store.selectTopic(topic.key)
                        } label: {
                            Text(displayNames[topic.key] ?? topic.name)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(selected ? .white : HM.textSub)
                                .padding(.horizontal, 13)
                                .padding(.vertical, 8)
                                .background(selected ? HM.green : HM.surface)
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(selected ? HM.green : HM.border, lineWidth: 2))
                        }
                    }
                }

                Text(store.data.selectedTopic == "all"
                     ? "모든 주제를 균등하게 출제합니다."
                     : "\(Topics.topic(for: store.data.selectedTopic).name) 단어를 약 65% 비중으로 출제합니다.")
                    .font(.system(size: 11))
                    .foregroundStyle(HM.textMuted)

                Button {
                    store.showTopicModal = false
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
}

/// 간단한 줄바꿈 칩 레이아웃
struct FlowChips: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? 300
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > width {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: width, height: y + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            sub.place(at: CGPoint(x: x, y: y), proposal: .unspecified)
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

// MARK: - 출석 달력 모달

struct CalendarModalView: View {
    @Environment(AppStore.self) private var store
    @State private var monthOffset = 0

    var body: some View {
        CenterModal(maxWidth: 310, onDismiss: { store.showCalendarModal = false }) {
            VStack(spacing: 14) {
                Text("📅 출석 달력")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)

                HStack {
                    navButton("chevron.left") { monthOffset -= 1 }
                    Spacer()
                    Text(monthTitle)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(HM.textPrimary)
                    Spacer()
                    navButton("chevron.right") { monthOffset += 1 }
                }

                calendarGrid

                HStack(spacing: 14) {
                    HStack(spacing: 4) {
                        Circle().fill(HM.green).frame(width: 10)
                        Text("출석한 날")
                    }
                    HStack(spacing: 4) {
                        Circle().stroke(HM.blue, lineWidth: 2).frame(width: 10)
                        Text("오늘")
                    }
                }
                .font(.system(size: 11))
                .foregroundStyle(HM.textMuted)

                Button {
                    store.showCalendarModal = false
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

    private func navButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(HM.textSecondary)
                .frame(width: 30, height: 30)
                .background(HM.bgMuted)
                .clipShape(Circle())
        }
    }

    private var displayMonth: Date {
        Calendar.current.date(byAdding: .month, value: monthOffset, to: Date()) ?? Date()
    }

    private var monthTitle: String {
        let c = Calendar.current.dateComponents([.year, .month], from: displayMonth)
        return "\(c.year ?? 0)년 \(c.month ?? 0)월"
    }

    private var calendarGrid: some View {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: displayMonth)
        let firstDay = cal.date(from: comps)!
        let daysInMonth = cal.range(of: .day, in: .month, for: firstDay)!.count
        let firstWeekday = cal.component(.weekday, from: firstDay) - 1  // 0=일
        let attendance = store.attendanceDates
        let today = DateUtil.todayString()

        return VStack(spacing: 6) {
            HStack(spacing: 0) {
                ForEach(Array(["일", "월", "화", "수", "목", "금", "토"].enumerated()), id: \.offset) { i, d in
                    Text(d)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(i == 0 ? HM.red : HM.textMuted)
                        .frame(maxWidth: .infinity)
                }
            }
            let cells: [Int?] = Array(repeating: nil, count: firstWeekday) + Array(1...daysInMonth)
            let rows = stride(from: 0, to: cells.count, by: 7).map { Array(cells[$0..<min($0 + 7, cells.count)]) }
            ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
                HStack(spacing: 0) {
                    ForEach(Array(row.enumerated()), id: \.offset) { pair in
                        let day = pair.element
                        dayCell(day, attendance: attendance, today: today, row: row, index: pair.offset)
                            .frame(maxWidth: .infinity)
                    }
                    if row.count < 7 {
                        ForEach(0..<(7 - row.count), id: \.self) { _ in
                            Color.clear.frame(maxWidth: .infinity).frame(height: 32)
                        }
                    }
                }
            }
        }
    }

    private func dateString(_ day: Int) -> String {
        let c = Calendar.current.dateComponents([.year, .month], from: displayMonth)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, day)
    }

    @ViewBuilder
    private func dayCell(_ day: Int?, attendance: Set<String>, today: String, row: [Int?], index: Int) -> some View {
        if let day {
            let ds = dateString(day)
            let attended = attendance.contains(ds)
            let isToday = ds == today
            // 같은 주 연속 출석 연결 바
            let prevAttended = index > 0 && row[index - 1].map { attendance.contains(dateString($0)) } == true

            ZStack {
                if attended && prevAttended {
                    HStack(spacing: 0) {
                        Rectangle().fill(HM.green.opacity(0.35)).frame(height: 18)
                        Spacer().frame(width: 16)
                    }
                    .offset(x: -8)
                }
                Circle()
                    .fill(attended ? HM.green : .clear)
                    .frame(width: 32, height: 32)
                    .overlay(Circle().stroke(isToday ? HM.blue : .clear, lineWidth: 2))
                Text("\(day)")
                    .font(.system(size: 13, weight: attended ? .heavy : .regular))
                    .foregroundStyle(attended ? .white : HM.textBody)
            }
            .frame(height: 32)
        } else {
            Color.clear.frame(height: 32)
        }
    }
}

// MARK: - 업적 모달

struct AchievementModalView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        CenterModal(maxWidth: 320, onDismiss: { store.showAchievementModal = false }) {
            VStack(spacing: 14) {
                Text("🏅 학습 업적 현황")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)

                VStack(spacing: 10) {
                    ForEach(Badges.all) { badge in
                        let unlocked = badge.isUnlocked(store.data)
                        HStack(spacing: 12) {
                            Text(badge.emoji)
                                .font(.system(size: 28))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(badge.name)
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(HM.textPrimary)
                                Text(badge.condition)
                                    .font(.system(size: 11))
                                    .foregroundStyle(HM.textMuted)
                            }
                            Spacer()
                            if unlocked {
                                Image(systemName: "checkmark.seal.fill")
                                    .foregroundStyle(Color(hex: badge.borderHex))
                            }
                        }
                        .padding(12)
                        .background(HM.bgSubtle)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(unlocked ? Color(hex: badge.borderHex) : HM.border, lineWidth: 1.5)
                        )
                        .grayscale(unlocked ? 0 : 1)
                        .opacity(unlocked ? 1 : 0.4)
                    }
                }

                Button {
                    store.showAchievementModal = false
                } label: {
                    Text("확인")
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
    }
}

// MARK: - 종료 확인 모달

struct ExitConfirmModalView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        CenterModal(maxWidth: 290, onDismiss: { store.showExitConfirm = false }) {
            VStack(spacing: 12) {
                Text("🏠")
                    .font(.system(size: 40))
                Text("학습을 종료할까요?")
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)
                Text("지금까지 푼 문제의 기록은\n안전하게 저장돼요.")
                    .font(.system(size: 13))
                    .foregroundStyle(HM.textSecondary)
                    .multilineTextAlignment(.center)
                ModalButtonRow(cancelLabel: "계속 풀기", confirmLabel: "홈으로") {
                    store.showExitConfirm = false
                } onConfirm: {
                    store.exitToHome()
                }
            }
        }
    }
}

// MARK: - 로그아웃 확인 모달

struct LogoutConfirmModalView: View {
    @Environment(AppStore.self) private var store

    private var isAnon: Bool { store.user?.isAnonymous ?? false }

    var body: some View {
        CenterModal(maxWidth: 290, onDismiss: { store.showLogoutConfirm = false }) {
            VStack(spacing: 12) {
                HarangFigure(pose: .sad, scarfColor: Color(hex: store.data.scarfColor),
                             size: 84, animated: false)
                Text(isAnon ? "로그인 화면으로 갈까요?" : "로그아웃할까요?")
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)
                Text(isAnon
                     ? "계정을 만들면 학습 기록이 안전하게 보관돼요. (익명 기록은 이전되지 않아요)"
                     : "학습 기록은 계정에 안전하게\n저장되어 있어요.")
                    .font(.system(size: 13))
                    .foregroundStyle(HM.textSecondary)
                    .multilineTextAlignment(.center)
                ModalButtonRow(cancelLabel: "돌아가기",
                               confirmLabel: isAnon ? "로그인하기" : "로그아웃",
                               confirmColor: isAnon ? nil : HM.red) {
                    store.showLogoutConfirm = false
                } onConfirm: {
                    store.signOut()
                }
            }
        }
    }
}

// MARK: - 이어하기 모달

struct ResumeModalView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        CenterModal(maxWidth: 290) {
            VStack(spacing: 12) {
                HarangFigure(pose: .idle, scarfColor: Color(hex: store.data.scarfColor),
                             size: 84, animated: false)
                Text("풀던 문제가 있어요!")
                    .font(.system(size: 17, weight: .heavy))
                    .foregroundStyle(HM.textPrimary)
                if let s = store.data.currentSession {
                    Text("\(s.completedQuestions)/\(s.dailyTarget) 문제까지 풀었어요.\n지난 학습을 이어서 할까요?")
                        .font(.system(size: 13))
                        .foregroundStyle(HM.textSecondary)
                        .multilineTextAlignment(.center)
                }
                ModalButtonRow(cancelLabel: "새로 시작", confirmLabel: "이어서 풀기") {
                    store.discardSavedSession()
                } onConfirm: {
                    store.resumeSession()
                }
            }
        }
    }
}
