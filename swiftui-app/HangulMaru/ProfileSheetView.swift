import SwiftUI

/// 프로필 설정 시트 (풀스크린)
struct ProfileSheetView: View {
    @Environment(AppStore.self) private var store

    @State private var nickname = ""
    @State private var pose = "idle"
    @State private var scarf = "#10B981"
    @State private var title = "🐣 아기 병아리"
    @State private var targetCount = 30
    @State private var titleExpanded = false

    private var isAnon: Bool { store.user?.isAnonymous ?? false }

    var body: some View {
        VStack(spacing: 0) {
            // 헤더
            HStack {
                Button {
                    store.showProfileSheet = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(HM.textSecondary)
                        .frame(width: 34, height: 34)
                        .background(HM.bgMuted)
                        .clipShape(Circle())
                }
                Spacer()
                Text("프로필 설정")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundStyle(HM.textPrimary)
                Spacer()
                Color.clear.frame(width: 34, height: 34)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)

            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // 포즈 선택
                    section("프로필 하랑이 포즈") {
                        HStack(spacing: 12) {
                            posePicker("idle", pose: .idle)
                            posePicker("clap", pose: .clap)
                            posePicker("party", pose: .party)
                            posePicker("sad", pose: .sad)
                        }
                    }

                    // 목도리 색
                    section("목도리 색") {
                        HStack(spacing: 14) {
                            ForEach(HM.scarfColors, id: \.self) { hex in
                                let selected = scarf == hex
                                Circle()
                                    .fill(Color(hex: hex))
                                    .frame(width: 28, height: 28)
                                    .overlay(Circle().stroke(selected ? HM.inkText : .clear, lineWidth: 2.5))
                                    .scaleEffect(selected ? 1.15 : 1)
                                    .animation(.spring(duration: 0.2), value: selected)
                                    .onTapGesture { scarf = hex }
                            }
                        }
                    }

                    // 닉네임
                    section("닉네임 (활동명)") {
                        TextField("이름을 입력하세요", text: $nickname)
                            .font(.system(size: 16, weight: .bold))
                            .multilineTextAlignment(.center)
                            .padding(.vertical, 13)
                            .background(HM.bgSubtle)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.border, lineWidth: 1.5))
                    }

                    // 칭호
                    section("나의 칭호 설정") {
                        VStack(spacing: 8) {
                            Button {
                                withAnimation(.easeOut(duration: 0.2)) { titleExpanded.toggle() }
                            } label: {
                                HStack {
                                    Text(title)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(HM.textPrimary)
                                    Spacer()
                                    Image(systemName: titleExpanded ? "chevron.up" : "chevron.down")
                                        .font(.system(size: 12, weight: .bold))
                                        .foregroundStyle(HM.textMuted)
                                }
                                .padding(14)
                                .background(HM.bgSubtle)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(HM.border, lineWidth: 1.5))
                            }

                            if titleExpanded {
                                VStack(spacing: 6) {
                                    ForEach(Titles.all) { def in
                                        let unlocked = def.isUnlocked(store.data)
                                        let selected = title == def.title
                                        Button {
                                            if unlocked { title = def.title }
                                        } label: {
                                            HStack {
                                                Text(def.title)
                                                    .font(.system(size: 14, weight: .bold))
                                                    .foregroundStyle(selected ? Color(hex: "#065f46") : HM.textSub)
                                                Spacer()
                                                if !unlocked {
                                                    HStack(spacing: 4) {
                                                        Image(systemName: "lock.fill")
                                                        Text(def.condition)
                                                    }
                                                    .font(.system(size: 11))
                                                    .foregroundStyle(HM.textMuted)
                                                }
                                            }
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 11)
                                            .background(selected ? HM.brandMint : HM.bgSubtle)
                                            .clipShape(RoundedRectangle(cornerRadius: 12))
                                        }
                                        .disabled(!unlocked)
                                        .opacity(unlocked ? 1 : 0.45)
                                    }
                                }
                            }
                        }
                    }

                    // 1회 학습 단어 수
                    section("1회 학습 단어 수") {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: 8) {
                                ForEach([10, 20, 30, 40, 50], id: \.self) { n in
                                    let selected = targetCount == n
                                    Button {
                                        targetCount = n
                                    } label: {
                                        Text("\(n)")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(selected ? Color(hex: "#065f46") : HM.textSub)
                                            .frame(maxWidth: .infinity)
                                            .padding(.vertical, 10)
                                            .background(selected ? HM.brandMint : HM.bgSubtle)
                                            .clipShape(Capsule())
                                            .overlay(Capsule().stroke(selected ? HM.green : HM.border, lineWidth: 1.5))
                                    }
                                }
                            }
                            Text("※ 다음 학습 세션부터 적용됩니다.")
                                .font(.system(size: 11))
                                .foregroundStyle(HM.textMuted)
                        }
                    }
                }
                .padding(20)
            }

            // 하단 고정
            VStack(spacing: 10) {
                Button {
                    store.saveProfile(nickname: nickname, pose: pose, scarf: scarf,
                                      title: title, targetCount: targetCount)
                } label: {
                    Text("저장")
                }
                .buttonStyle(PrimaryButtonStyle())

                Button {
                    store.showLogoutConfirm = true
                } label: {
                    Text(isAnon ? "로그인" : "로그아웃")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(isAnon ? Color(hex: "#10b981") : HM.red)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(HM.surface)
        }
        .background(HM.bg)
        .onAppear {
            nickname = store.data.nickname
            pose = store.data.avatarPose
            scarf = store.data.scarfColor
            title = store.data.equippedTitle
            targetCount = store.data.targetWordCount
        }
    }

    private func section(_ label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(label)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(HM.textSub)
            content()
        }
    }

    private func posePicker(_ key: String, pose figPose: HarangPose) -> some View {
        let selected = pose == key
        return Button {
            pose = key
        } label: {
            HarangFigure(pose: figPose, scarfColor: Color(hex: scarf), size: 52, animated: false)
                .frame(width: 62, height: 62)
                .background(selected ? HM.brandMint : HM.bgSubtle)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(selected ? Color(hex: "#10B981") : HM.border, lineWidth: selected ? 2 : 1)
                )
        }
    }
}
