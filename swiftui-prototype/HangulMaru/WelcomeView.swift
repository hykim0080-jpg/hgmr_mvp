import SwiftUI

struct WelcomeView: View {
    @Environment(WordStore.self) private var store
    @State private var bounce = false

    var body: some View {
        ZStack {
            HM.mint.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // 말풍선
                Text("안녕! 오늘도 같이 배워볼까?")
                    .font(.headline)
                    .foregroundStyle(HM.ink)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 20))
                    .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
                    .padding(.bottom, 20)

                // 웰컴 하랑이
                HarangView(size: 190, mood: .idle)
                    .offset(y: bounce ? -8 : 4)
                    .animation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true), value: bounce)
                    .onAppear { bounce = true }

                // 워드마크
                Text("한글마루")
                    .font(.system(size: 44, weight: .heavy, design: .rounded))
                    .foregroundStyle(HM.tealDeep)
                    .padding(.top, 8)

                Text("어휘가 자라는 즐거움")
                    .font(.subheadline)
                    .foregroundStyle(HM.sub)
                    .padding(.top, 4)

                Spacer()

                // 시작 버튼 스택 (프로토타입: 로그인 생략)
                VStack(spacing: 12) {
                    Button {
                        store.goHome()
                    } label: {
                        Text("시작하기")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(HM.teal)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    Text("SwiftUI 프로토타입 — 로그인 없이 체험")
                        .font(.caption)
                        .foregroundStyle(HM.sub)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
    }
}

#Preview {
    WelcomeView().environment(WordStore())
}
