import SwiftUI

@main
struct HangulMaruApp: App {
    @State private var store = WordStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .fontDesign(.rounded)
        }
    }
}

struct RootView: View {
    @Environment(WordStore.self) private var store

    var body: some View {
        ZStack {
            switch store.screen {
            case .welcome:
                WelcomeView()
                    .transition(.opacity)
            case .home:
                HomeView()
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            case .quiz:
                QuizView()
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            case .result:
                ResultView()
                    .transition(.opacity)
            }
        }
        .animation(.spring(duration: 0.35), value: store.screen)
    }
}
