import SwiftUI

/// 웰컴 화면 — 민트 배경 + 말풍선 + 하랑이 + 버튼 3종 / 시작 게이트
struct WelcomeView: View {
    @Environment(AppStore.self) private var store
    @State private var pulse = false

    var body: some View {
        ZStack {
            HM.brandMint.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // 말풍선
                SpeechBubble {
                    Text("안녕! 오늘도 같이 배워볼까?")
                        .font(.jua(20))
                        .foregroundStyle(HM.inkText)
                }

                // 웰컴 하랑이 (깜빡임)
                HarangFigure(pose: .idle, scarfColor: Color(hex: store.data.scarfColor.isEmpty ? "#10B981" : store.data.scarfColor), size: 216)
                    .padding(.top, 18)

                // 워드마크
                Text("한글마루")
                    .font(.jua(34))
                    .foregroundStyle(HM.inkText)
                    .padding(.top, 10)

                Spacer()

                if store.splashDone {
                    bottomArea
                        .transition(.opacity.combined(with: .offset(y: 12)))
                }
            }
            .padding(24)
        }
        .contentShape(Rectangle())
        .onTapGesture {
            if store.splashDone && store.hasPersistedSession {
                store.enterFromGate()
            }
        }
        .animation(.timingCurve(0.22, 1, 0.36, 1, duration: 0.55), value: store.splashDone)
    }

    @ViewBuilder private var bottomArea: some View {
        if store.hasPersistedSession {
            // 시작 게이트
            Text("화면을 터치하여 시작하기")
                .font(.system(size: 16, weight: .heavy))
                .foregroundStyle(HM.inkText)
                .opacity(pulse ? 1 : 0.55)
                .offset(y: pulse ? -3 : 0)
                .onAppear {
                    withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                        pulse = true
                    }
                }
                .padding(.bottom, 40)
        } else {
            VStack(spacing: 12) {
                Button("이메일로 시작하기") {
                    store.screen = .emailLogin
                }
                .buttonStyle(InkButtonStyle(fill: Color(hex: "#10B981"), textColor: .white))

                Button {
                    store.signInGoogle()
                } label: {
                    HStack(spacing: 10) {
                        Text("G")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(Color(hex: "#4285F4"))
                            .frame(width: 24, height: 24)
                            .background(HM.bgMuted)
                            .clipShape(Circle())
                        Text("Google로 계속하기")
                    }
                }
                .buttonStyle(InkButtonStyle(fill: HM.surface, textColor: HM.inkText))

                Button {
                    store.signInAnonymously()
                } label: {
                    Text("로그인 없이 둘러보기")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(HM.textSecondary)
                        .underline()
                        .frame(height: 44)
                }
            }
            .frame(maxWidth: 360)
        }
    }
}

/// 만화풍 말풍선 (하드 오프셋 그림자 + 꼬리)
struct SpeechBubble<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(HM.surface)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(HM.inkBorder, lineWidth: 2.5))
            .background(
                RoundedRectangle(cornerRadius: 18).fill(HM.inkBorder).offset(x: 3, y: 3)
            )
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(HM.surface)
                    .frame(width: 18, height: 18)
                    .rotationEffect(.degrees(45))
                    .overlay(
                        BubbleTailBorder()
                            .stroke(HM.inkBorder, lineWidth: 2.5)
                            .rotationEffect(.degrees(45))
                    )
                    .offset(y: 10)
            }
    }
}

private struct BubbleTailBorder: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        return p
    }
}

#Preview {
    WelcomeView().environment(AppStore())
}
