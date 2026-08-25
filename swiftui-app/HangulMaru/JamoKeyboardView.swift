import SwiftUI
import UIKit

/// 빙하 테마 자모 커스텀 키보드 (두벌식)
struct JamoKeyboardView: View {
    var onJamo: (String) -> Void
    var onBackspace: () -> Void
    var onSpace: () -> Void
    var onSubmit: () -> Void

    @State private var shiftOn = false
    @State private var poppedKey: String? = nil

    static let row1 = ["ㅂ", "ㅈ", "ㄷ", "ㄱ", "ㅅ", "ㅛ", "ㅕ", "ㅑ", "ㅐ", "ㅔ"]
    static let row2 = ["ㅁ", "ㄴ", "ㅇ", "ㄹ", "ㅎ", "ㅗ", "ㅓ", "ㅏ", "ㅣ"]
    static let row3 = ["ㅋ", "ㅌ", "ㅊ", "ㅍ", "ㅠ", "ㅜ", "ㅡ"]

    static let shiftMap: [String: String] = [
        "ㅂ": "ㅃ", "ㅈ": "ㅉ", "ㄷ": "ㄸ", "ㄱ": "ㄲ", "ㅅ": "ㅆ", "ㅐ": "ㅒ", "ㅔ": "ㅖ",
    ]

    private func display(_ key: String) -> String {
        shiftOn ? (Self.shiftMap[key] ?? key) : key
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 7) {
                ForEach(Self.row1, id: \.self) { jamoKey($0) }
            }
            HStack(spacing: 7) {
                ForEach(Self.row2, id: \.self) { jamoKey($0) }
            }
            .padding(.horizontal, 14)
            HStack(spacing: 7) {
                PressableKey(kind: .fn(icon: "shift.fill", active: shiftOn)) {
                    shiftOn.toggle()
                }
                .frame(width: 44)
                ForEach(Self.row3, id: \.self) { jamoKey($0) }
                PressableKey(kind: .fn(icon: "delete.left.fill", active: false),
                             repeatsOnHold: true) {
                    onBackspace()
                }
                .frame(width: 44)
            }
            HStack(spacing: 7) {
                PressableKey(kind: .space) { onSpace() }
                PressableKey(kind: .submit) { onSubmit() }
                    .frame(width: 108)
            }
        }
        .padding(.top, 16)
        .padding(.horizontal, 8)
        .padding(.bottom, 8)
        .background(
            LinearGradient(colors: [HM.kbdBgTop, HM.kbdBgBottom], startPoint: .top, endPoint: .bottom)
                .background(.ultraThinMaterial)
        )
        .clipShape(UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28))
        .overlay(alignment: .top) {
            UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28)
                .stroke(HM.kbdEdge, lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.08), radius: 12, y: -5)
        .frame(maxWidth: 480)
    }

    private func jamoKey(_ key: String) -> some View {
        PressableKey(kind: .jamo(display(key)), popped: poppedKey == display(key)) {
            let jamo = display(key)
            onJamo(jamo)
            popKey(jamo)
            if shiftOn { shiftOn = false }   // 1회용 시프트
        }
    }

    private func popKey(_ key: String) {
        poppedKey = key
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(240))
            if poppedKey == key { poppedKey = nil }
        }
    }
}

// MARK: - 터치다운 입력 키

private struct PressableKey: View {
    enum Kind {
        case jamo(String)
        case fn(icon: String, active: Bool)
        case space
        case submit
    }

    var kind: Kind
    var popped = false
    var repeatsOnHold = false
    var action: () -> Void

    @State private var isPressed = false
    @State private var repeatTask: Task<Void, Never>? = nil

    var body: some View {
        content
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(background)
            .clipShape(RoundedRectangle(cornerRadius: 13))
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(borderColor, lineWidth: 1))
            .overlay(alignment: .topLeading) {
                if case .jamo = kind, !isPressed {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(HM.kbdGloss)
                        .frame(width: 14, height: 5)
                        .rotationEffect(.degrees(-4))
                        .offset(x: 6, y: 5)
                }
            }
            .shadow(color: shadowColor, radius: isPressed ? 4 : 1.5, y: isPressed ? 2 : 1.5)
            .overlay(alignment: .top) { popPreview }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        guard !isPressed else { return }
                        isPressed = true
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        action()   // 터치다운 즉시 입력
                        if repeatsOnHold {
                            repeatTask = Task { @MainActor in
                                try? await Task.sleep(for: .milliseconds(400))
                                while !Task.isCancelled {
                                    action()
                                    try? await Task.sleep(for: .milliseconds(80))
                                }
                            }
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                        repeatTask?.cancel()
                        repeatTask = nil
                    }
            )
    }

    @ViewBuilder private var content: some View {
        switch kind {
        case .jamo(let label):
            Text(label)
                .font(.system(size: 20, weight: .semibold))
                .foregroundStyle(isPressed ? .white : HM.kbdKeyText)
        case .fn(let icon, let active):
            Image(systemName: icon)
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(active || isPressed ? .white : HM.kbdKeyText)
        case .space:
            Text("띄어쓰기")
                .font(.system(size: 14, weight: .semibold))
                .kerning(2)
                .foregroundStyle(isPressed ? .white : HM.kbdKeyText)
        case .submit:
            Text("제출")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
        }
    }

    @ViewBuilder private var background: some View {
        switch kind {
        case .jamo, .space:
            if isPressed {
                HM.green
            } else {
                LinearGradient(
                    stops: [
                        .init(color: HM.kbdKeyTop, location: 0),
                        .init(color: HM.kbdKeyMid, location: 0.55),
                        .init(color: HM.kbdKeyBottom, location: 1),
                    ],
                    startPoint: .top, endPoint: .bottom)
            }
        case .fn(_, let active):
            if active {
                HM.skyText
            } else if isPressed {
                HM.kbdFnActive
            } else {
                LinearGradient(colors: [HM.kbdFnTop, HM.kbdFnBottom],
                               startPoint: .top, endPoint: .bottom)
            }
        case .submit:
            if isPressed {
                LinearGradient(colors: [Color(hex: "#34d399"), Color(hex: "#0b9c68")],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            } else {
                LinearGradient(colors: [HM.shardGreenLight, HM.green, Color(hex: "#0b9c68")],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        }
    }

    private var borderColor: Color {
        if case .submit = kind { return .clear }
        return isPressed ? HM.green : HM.kbdKeyBorder
    }

    private var shadowColor: Color {
        isPressed ? HM.green.opacity(0.35) : Color(hex: "#0f172a").opacity(0.12)
    }

    @ViewBuilder private var popPreview: some View {
        if popped, case .jamo(let label) = kind {
            Text(label)
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(HM.kbdKeyText)
                .frame(width: 54, height: 58)
                .background(HM.kbdKeyTop)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .shadow(color: .black.opacity(0.18), radius: 8, y: 3)
                .offset(y: -62)
                .allowsHitTesting(false)
                .transition(.opacity)
        }
    }
}

#Preview {
    VStack {
        Spacer()
        JamoKeyboardView(onJamo: { _ in }, onBackspace: {}, onSpace: {}, onSubmit: {})
    }
    .background(HM.bg)
}
