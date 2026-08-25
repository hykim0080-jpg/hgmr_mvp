import SwiftUI
import UIKit

// MARK: - 색상 토큰 (웹앱 CSS 변수 대응, 라이트/다크 자동 전환)

extension Color {
    init(light: String, dark: String) {
        self.init(uiColor: UIColor { trait in
            UIColor(hex: trait.userInterfaceStyle == .dark ? dark : light)
        })
    }

    init(hex: String) {
        self.init(uiColor: UIColor(hex: hex))
    }
}

extension UIColor {
    convenience init(hex: String) {
        var h = hex.trimmingCharacters(in: .whitespaces)
        if h.hasPrefix("#") { h.removeFirst() }
        var rgb: UInt64 = 0
        Scanner(string: h).scanHexInt64(&rgb)
        if h.count == 6 {
            self.init(red: CGFloat((rgb >> 16) & 0xFF) / 255,
                      green: CGFloat((rgb >> 8) & 0xFF) / 255,
                      blue: CGFloat(rgb & 0xFF) / 255, alpha: 1)
        } else {
            self.init(red: CGFloat((rgb >> 24) & 0xFF) / 255,
                      green: CGFloat((rgb >> 16) & 0xFF) / 255,
                      blue: CGFloat((rgb >> 8) & 0xFF) / 255,
                      alpha: CGFloat(rgb & 0xFF) / 255)
        }
    }
}

enum HM {
    // 서피스/배경
    static let bg = Color(light: "#ffffff", dark: "#0f1420")
    static let bgSubtle = Color(light: "#f8fafc", dark: "#151c2a")
    static let bgMuted = Color(light: "#f1f5f9", dark: "#202939")
    static let surface = Color(light: "#ffffff", dark: "#1a2231")
    static let border = Color(light: "#e2e8f0", dark: "#2b3547")
    static let borderStrong = Color(light: "#cbd5e1", dark: "#3d4a60")

    // 텍스트
    static let textPrimary = Color(light: "#1e293b", dark: "#e6ebf4")
    static let textBody = Color(light: "#334155", dark: "#cfd8e5")
    static let textSub = Color(light: "#475569", dark: "#b4c0d1")
    static let textSecondary = Color(light: "#64748b", dark: "#93a0b4")
    static let textMuted = Color(light: "#94a3b8", dark: "#6e7a8d")
    static let inkText = Color(light: "#2a2f3a", dark: "#e8edf5")
    static let inkBorder = Color(light: "#3B4252", dark: "#3d4a60")

    // 톤 배경
    static let brandMint = Color(light: "#ecfdf5", dark: "#0e2e23")
    static let mintBorder = Color(light: "#a7f3d0", dark: "#14532d")
    static let infoSoft = Color(light: "#f0f9ff", dark: "#14283c")
    static let infoBG = Color(light: "#eff6ff", dark: "#172a45")
    static let infoBorder = Color(light: "#bae6fd", dark: "#1e4a6e")
    static let amberSoft = Color(light: "#fffbeb", dark: "#33270e")
    static let limeSoft = Color(light: "#f7fee7", dark: "#1d2a10")
    static let tealSoft = Color(light: "#f0fdfa", dark: "#0e2a26")
    static let dangerBG = Color(light: "#fef2f2", dark: "#351b20")
    static let dangerBorder = Color(light: "#fecaca", dark: "#542a31")
    static let indigoBG = Color(light: "#eef2ff", dark: "#252a4d")
    static let overlay = Color(light: "#00000066", dark: "#0000009E")
    static let toastBG = Color(light: "#1e293bF2", dark: "#334155F7")

    // 브랜드 상수색 (라이트/다크 동일)
    static let green = Color(hex: "#10b981")
    static let greenDeep = Color(hex: "#059669")
    static let green700 = Color(hex: "#047857")
    static let blue = Color(hex: "#3b82f6")
    static let blueDeep = Color(hex: "#1d4ed8")
    static let red = Color(hex: "#ef4444")
    static let redDeep = Color(hex: "#b91c1c")
    static let amber = Color(hex: "#f59e0b")
    static let amberDeep = Color(hex: "#d97706")
    static let indigo = Color(hex: "#6366f1")
    static let indigoDeep = Color(hex: "#4f46e5")
    static let sky = Color(hex: "#38BDF8")
    static let skyLight = Color(hex: "#7DD3FC")
    static let skyText = Color(hex: "#0284c7")

    // 키보드 (빙하 테마)
    static let kbdBgTop = Color(light: "#DCECF7F2", dark: "#152030F2")
    static let kbdBgBottom = Color(light: "#C4DCEFF5", dark: "#0D1522F7")
    static let kbdEdge = Color(light: "#FFFFFFD9", dark: "#FFFFFF14")
    static let kbdKeyTop = Color(light: "#ffffff", dark: "#3c4d68")
    static let kbdKeyMid = Color(light: "#eaf4fb", dark: "#2d3c55")
    static let kbdKeyBottom = Color(light: "#d8e9f5", dark: "#253247")
    static let kbdKeyBorder = Color(light: "#FFFFFFE6", dark: "#FFFFFF1A")
    static let kbdGloss = Color(light: "#FFFFFFD9", dark: "#FFFFFF21")
    static let kbdKeyText = Color(light: "#27516e", dark: "#dce8f6")
    static let kbdFnTop = Color(light: "#e6f1f9", dark: "#283a52")
    static let kbdFnBottom = Color(light: "#cfe2f0", dark: "#1f2c40")
    static let kbdFnActive = Color(light: "#b9d3e6", dark: "#3e5678")

    // 하랑이
    static let harangBody = Color(hex: "#E5E8EE")
    static let harangBelly = Color(hex: "#DFE3E9")
    static let harangFin = Color(hex: "#DCE0E8")
    static let harangLine = Color(hex: "#3B4252")
    static let harangEye = Color(hex: "#262B36")
    static let harangCheek = Color(hex: "#F8B9C5")
    static let harangWhisker = Color(hex: "#C6CDD9")
    static let harangTongue = Color(hex: "#F58A9C")
    static let harangTear = Color(hex: "#7DD3FC")
    static let shardGreen = Color(hex: "#34D399")
    static let shardGreenLight = Color(hex: "#6EE7B7")

    static let scarfColors = ["#10B981", "#3B82F6", "#F472B6", "#F59E0B", "#8B5CF6"]

    static let greenGradient = LinearGradient(
        colors: [Color(hex: "#10b981"), Color(hex: "#059669")],
        startPoint: .topLeading, endPoint: .bottomTrailing)
    static let levelBadgeGradient = LinearGradient(
        colors: [Color(hex: "#ef4444"), Color(hex: "#f97316")],
        startPoint: .topLeading, endPoint: .bottomTrailing)
}

// MARK: - Jua 대체 폰트 (라운드 헤비 시스템 폰트)

extension Font {
    static func jua(_ size: CGFloat) -> Font {
        // 원본은 Google Fonts 'Jua'. 번들 라이선스 확인 전까지 라운드 헤비로 대체.
        .system(size: size, weight: .heavy, design: .rounded)
    }
}

// MARK: - 공통 버튼 스타일

/// 웰컴 화면 만화풍 버튼 (하드 오프셋 그림자 + 눌림 이동)
struct InkButtonStyle: ButtonStyle {
    var fill: Color
    var textColor: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.jua(19))
            .foregroundStyle(textColor)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(fill)
            .clipShape(RoundedRectangle(cornerRadius: 18))
            .overlay(RoundedRectangle(cornerRadius: 18).stroke(HM.inkBorder, lineWidth: 2.5))
            .background(
                RoundedRectangle(cornerRadius: 18)
                    .fill(HM.inkBorder)
                    .offset(x: configuration.isPressed ? 1 : 3, y: configuration.isPressed ? 1 : 3)
            )
            .offset(x: configuration.isPressed ? 2 : 0, y: configuration.isPressed ? 2 : 0)
            .animation(.linear(duration: 0.06), value: configuration.isPressed)
    }
}

/// 기본 초록 그라데이션 버튼
struct PrimaryButtonStyle: ButtonStyle {
    var fontSize: CGFloat = 16

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: fontSize, weight: .bold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(HM.greenGradient)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .opacity(configuration.isPressed ? 0.85 : 1)
    }
}
