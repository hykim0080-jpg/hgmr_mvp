import SwiftUI

@main
struct HangulMaruApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
        }
    }
}

struct RootView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        @Bindable var store = store

        ZStack {
            HM.bg.ignoresSafeArea()

            switch store.screen {
            case .welcome:
                WelcomeView()
            case .emailLogin:
                EmailLoginView()
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            case .home, .quiz, .result:
                VStack(spacing: 0) {
                    AppHeaderView()
                    switch store.screen {
                    case .home: HomeView()
                    case .quiz: QuizView()
                    case .result: ResultView()
                    default: EmptyView()
                    }
                }
            }

            modalLayer
            toastLayer
        }
        .animation(.easeOut(duration: 0.28), value: store.screen)
        .fullScreenCover(isPresented: $store.showProfileSheet) {
            ProfileSheetView()
        }
        .sheet(isPresented: $store.showAdminPanel) {
            AdminPanelView()
        }
    }

    // MARK: - 모달 레이어

    @ViewBuilder private var modalLayer: some View {
        if store.showTopicModal { TopicModalView() }
        if store.showCalendarModal { CalendarModalView() }
        if store.showVocabModal { VocabModalView() }
        if store.showStatsModal { StatsModalView() }
        if store.showAchievementModal { AchievementModalView() }
        if store.showExitConfirm { ExitConfirmModalView() }
        if store.showLogoutConfirm { LogoutConfirmModalView() }
        if store.showResumeModal { ResumeModalView() }
        if store.showReportModal { ReportModalView() }
        if store.showPlacementIntro { PlacementIntroModalView() }
        if store.showPlacementResult { PlacementResultModalView() }
        if store.showAltitudeGuide { AltitudeGuideModalView() }
    }

    // MARK: - 토스트

    @ViewBuilder private var toastLayer: some View {
        if let toast = store.toast {
            VStack {
                Text(toast.message)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 12)
                    .background(toast.isError ? Color(hex: "#BE2D2DF2") : HM.toastBG)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .shadow(color: .black.opacity(0.25), radius: 15, y: 10)
                    .frame(maxWidth: 340)
                    .padding(.top, 16)
                Spacer()
            }
            .transition(.move(edge: .top).combined(with: .opacity))
            .animation(.easeOut(duration: 0.25), value: store.toast)
            .zIndex(3000)
        }
    }
}

// MARK: - 중앙 모달 공통 래퍼

struct CenterModal<Content: View>: View {
    var maxWidth: CGFloat = 300
    var onDismiss: (() -> Void)? = nil
    @ViewBuilder var content: Content

    @State private var appeared = false

    var body: some View {
        ZStack {
            HM.overlay
                .ignoresSafeArea()
                .onTapGesture { onDismiss?() }
            content
                .padding(24)
                .frame(maxWidth: maxWidth)
                .background(HM.surface)
                .clipShape(RoundedRectangle(cornerRadius: 22))
                .shadow(color: .black.opacity(0.25), radius: 30, y: 15)
                .padding(.horizontal, 20)
                .offset(y: appeared ? 0 : 15)
                .opacity(appeared ? 1 : 0)
        }
        .zIndex(2000)
        .onAppear {
            withAnimation(.easeOut(duration: 0.25)) { appeared = true }
        }
    }
}

// MARK: - 모달 하단 버튼 행 공통

struct ModalButtonRow: View {
    var cancelLabel: String
    var confirmLabel: String
    var confirmColor: Color? = nil      // nil이면 초록 그라데이션
    var onCancel: () -> Void
    var onConfirm: () -> Void

    var body: some View {
        HStack(spacing: 10) {
            Button(action: onCancel) {
                Text(cancelLabel)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(HM.textSecondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .background(HM.bgMuted)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            Button(action: onConfirm) {
                Text(confirmLabel)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 13)
                    .background {
                        if let c = confirmColor {
                            c
                        } else {
                            HM.greenGradient
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }
}
