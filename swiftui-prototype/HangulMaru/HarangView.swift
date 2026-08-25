import SwiftUI

/// 하랑이(물범) 캐릭터 — SwiftUI 도형으로 그린 간단 버전
struct HarangView: View {
    var size: CGFloat = 160
    var mood: Mood = .idle

    enum Mood {
        case idle    // 기본 포즈
        case happy   // 물범 박수 (정답)
        case sad     // 눈물 포즈 (오답)
        case party   // 파티 포즈 (결과)
    }

    var body: some View {
        ZStack {
            // 몸통
            Ellipse()
                .fill(Color.white)
                .frame(width: size, height: size * 0.92)
                .overlay(Ellipse().stroke(Color.black.opacity(0.08), lineWidth: size * 0.02))
                .shadow(color: .black.opacity(0.08), radius: size * 0.05, y: size * 0.03)

            // 목도리
            Capsule()
                .fill(HM.scarf)
                .frame(width: size * 0.62, height: size * 0.14)
                .offset(y: size * 0.27)
            RoundedRectangle(cornerRadius: size * 0.04)
                .fill(HM.scarf.opacity(0.9))
                .frame(width: size * 0.12, height: size * 0.2)
                .offset(x: size * 0.22, y: size * 0.41)

            // 눈
            Group {
                if mood == .sad {
                    ArcEye().stroke(HM.ink, style: StrokeStyle(lineWidth: size * 0.025, lineCap: .round))
                        .frame(width: size * 0.11, height: size * 0.05)
                        .offset(x: -size * 0.16, y: -size * 0.1)
                    ArcEye().stroke(HM.ink, style: StrokeStyle(lineWidth: size * 0.025, lineCap: .round))
                        .frame(width: size * 0.11, height: size * 0.05)
                        .offset(x: size * 0.16, y: -size * 0.1)
                    // 눈물
                    Circle()
                        .fill(HM.shardBlue.opacity(0.7))
                        .frame(width: size * 0.06)
                        .offset(x: -size * 0.16, y: -size * 0.01)
                } else {
                    Circle().fill(HM.ink)
                        .frame(width: size * 0.09)
                        .offset(x: -size * 0.16, y: -size * 0.1)
                        .overlay(
                            Circle().fill(.white).frame(width: size * 0.03)
                                .offset(x: -size * 0.145, y: -size * 0.115)
                        )
                    Circle().fill(HM.ink)
                        .frame(width: size * 0.09)
                        .offset(x: size * 0.16, y: -size * 0.1)
                        .overlay(
                            Circle().fill(.white).frame(width: size * 0.03)
                                .offset(x: size * 0.175, y: -size * 0.115)
                        )
                }
            }

            // 볼터치
            Circle().fill(HM.scarf.opacity(0.35))
                .frame(width: size * 0.09)
                .offset(x: -size * 0.26, y: -size * 0.01)
            Circle().fill(HM.scarf.opacity(0.35))
                .frame(width: size * 0.09)
                .offset(x: size * 0.26, y: -size * 0.01)

            // 코 + 입
            Circle().fill(HM.ink)
                .frame(width: size * 0.05)
                .offset(y: -size * 0.02)
            MouthShape(happy: mood == .happy || mood == .party)
                .stroke(HM.ink, style: StrokeStyle(lineWidth: size * 0.02, lineCap: .round))
                .frame(width: size * 0.16, height: size * 0.07)
                .offset(y: size * 0.07)

            // 수염
            ForEach([-1.0, 1.0], id: \.self) { side in
                VStack(spacing: size * 0.035) {
                    Capsule().fill(HM.ink.opacity(0.4)).frame(width: size * 0.12, height: size * 0.012)
                    Capsule().fill(HM.ink.opacity(0.4)).frame(width: size * 0.12, height: size * 0.012)
                }
                .offset(x: side * size * 0.3, y: size * 0.02)
            }

            // 지혜 조각 (기본 포즈: 파란 조각 안기)
            if mood == .idle || mood == .party {
                ShardShape()
                    .fill(
                        LinearGradient(colors: [HM.shardBlue, HM.shardBlue.opacity(0.6)],
                                       startPoint: .topLeading, endPoint: .bottomTrailing)
                    )
                    .frame(width: size * 0.2, height: size * 0.24)
                    .rotationEffect(.degrees(12))
                    .offset(x: -size * 0.02, y: size * 0.33)
                    .shadow(color: HM.shardBlue.opacity(0.4), radius: size * 0.04)
            }

            // 파티 모드: 색종이
            if mood == .party {
                ForEach(0..<8, id: \.self) { i in
                    Circle()
                        .fill([HM.scarf, HM.shardBlue, HM.teal, .yellow][i % 4])
                        .frame(width: size * 0.045)
                        .offset(
                            x: size * 0.55 * cos(Double(i) * .pi / 4),
                            y: size * 0.55 * sin(Double(i) * .pi / 4) - size * 0.1
                        )
                }
            }
        }
        .frame(width: size * 1.3, height: size * 1.2)
    }
}

/// 슬픈 눈 (아래로 볼록한 호)
private struct ArcEye: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY),
                       control: CGPoint(x: rect.midX, y: rect.maxY))
        return p
    }
}

private struct MouthShape: Shape {
    var happy: Bool
    func path(in rect: CGRect) -> Path {
        var p = Path()
        if happy {
            p.move(to: CGPoint(x: rect.minX, y: rect.minY))
            p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY),
                           control: CGPoint(x: rect.midX, y: rect.maxY))
        } else {
            p.move(to: CGPoint(x: rect.minX, y: rect.midY))
            p.addQuadCurve(to: CGPoint(x: rect.midX, y: rect.maxY),
                           control: CGPoint(x: rect.minX + rect.width * 0.25, y: rect.maxY))
            p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.midY),
                           control: CGPoint(x: rect.maxX - rect.width * 0.25, y: rect.maxY))
        }
        return p
    }
}

/// ㅎ 크리스털 느낌의 다이아몬드 조각
struct ShardShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.height * 0.35))
        p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.height * 0.35))
        p.closeSubpath()
        return p
    }
}

#Preview {
    VStack(spacing: 20) {
        HStack {
            HarangView(size: 90, mood: .idle)
            HarangView(size: 90, mood: .happy)
        }
        HStack {
            HarangView(size: 90, mood: .sad)
            HarangView(size: 90, mood: .party)
        }
    }
    .padding()
    .background(HM.mint)
}
