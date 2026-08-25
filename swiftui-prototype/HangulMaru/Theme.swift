import SwiftUI

/// 웹앱 CSS 변수와 대응하는 브랜드 색상
enum HM {
    static let mint = Color(red: 0.925, green: 0.992, blue: 0.960)       // --brand-mint #ecfdf5
    static let teal = Color(red: 0.051, green: 0.580, blue: 0.533)       // 주요 액션 (teal-600)
    static let tealDeep = Color(red: 0.04, green: 0.46, blue: 0.42)
    static let ink = Color(red: 0.118, green: 0.161, blue: 0.231)        // --text-primary #1e293b
    static let sub = Color(red: 0.392, green: 0.455, blue: 0.545)        // --text-secondary
    static let cardBG = Color(red: 0.973, green: 0.980, blue: 0.988)     // --bg-subtle #f8fafc
    static let scarf = Color(red: 0.973, green: 0.443, blue: 0.443)      // 하랑이 목도리 코랄
    static let shardBlue = Color(red: 0.231, green: 0.510, blue: 0.965)  // 지혜 조각(파랑)
    static let danger = Color(red: 0.86, green: 0.25, blue: 0.25)
    static let success = Color(red: 0.086, green: 0.639, blue: 0.290)
}

extension View {
    func hmCard() -> some View {
        self
            .padding(16)
            .background(HM.cardBG)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.black.opacity(0.06), lineWidth: 1)
            )
    }
}
