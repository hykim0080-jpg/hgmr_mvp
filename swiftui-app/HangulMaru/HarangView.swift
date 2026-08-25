import SwiftUI

// MARK: - 조각 아이콘 (다이아 + 하이라이트 facet + "ㅎ")

struct ShardIcon: View {
    enum Kind { case green, blue }
    var kind: Kind
    var showHieut = false
    var size: CGFloat = 22

    var body: some View {
        let fill = kind == .green ? HM.shardGreen : HM.sky
        let facet = kind == .green ? HM.shardGreenLight : HM.skyLight
        ZStack {
            DiamondShape()
                .fill(fill)
            DiamondShape()
                .fill(facet)
                .scaleEffect(0.45, anchor: .topLeading)
                .offset(x: size * 0.18, y: size * 0.12)
                .clipShape(DiamondShape())
            if showHieut {
                Text("ㅎ")
                    .font(.system(size: size * 0.42, weight: .black))
                    .foregroundStyle(.white)
            }
        }
        .frame(width: size * 0.82, height: size)
    }
}

struct DiamondShape: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.height * 0.38))
        p.addLine(to: CGPoint(x: rect.midX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.height * 0.38))
        p.closeSubpath()
        return p
    }
}

// MARK: - 하랑이 본체

enum HarangPose: String {
    case idle, clap, sad, aw, party
}

/// 320×320 좌표계로 그린 하랑이. 프레임 스텝 애니메이션(보간 없음) 재현.
struct HarangFigure: View {
    var pose: HarangPose
    var scarfColor: Color
    var size: CGFloat
    var animated = true

    var body: some View {
        Group {
            if animated {
                TimelineView(.animation(minimumInterval: 0.1)) { timeline in
                    frameView(at: timeline.date)
                }
            } else {
                HarangFrame(pose: pose, frame: staticFrame, scarfColor: scarfColor)
            }
        }
        .frame(width: 320, height: 320)
        .scaleEffect(size / 320)
        .frame(width: size, height: size)
    }

    private var staticFrame: Int {
        switch pose {
        case .clap: return 1     // fr-clap-3 (박수 위치)
        case .party: return 2    // fr-lv-3 (착지)
        default: return 0
        }
    }

    private func frameView(at date: Date) -> some View {
        let t = date.timeIntervalSinceReferenceDate
        let frame: Int
        switch pose {
        case .idle:
            frame = Int(t / 0.6) % 2          // 1.2s 주기 50/50
        case .clap:
            frame = Int(t / 0.3) % 2          // 0.3s 교대
        case .aw:
            frame = Int(t / 0.34) % 2
        case .sad:
            frame = Int(t / 0.6) % 2
        case .party:
            frame = Int(t / 0.3) % 3          // 0.9s 3프레임
        }
        return HarangFrame(pose: pose, frame: frame, scarfColor: scarfColor)
    }
}

/// 포즈·프레임별 실제 도형
private struct HarangFrame: View {
    var pose: HarangPose
    var frame: Int
    var scarfColor: Color

    private var line: Color { HM.harangLine }

    var body: some View {
        ZStack {
            switch pose {
            case .idle:  idleFrame
            case .clap:  clapFrame
            case .sad:   sadFrame
            case .aw:    awFrame
            case .party: partyFrame
            }
        }
    }

    // MARK: 몸통 공통

    private func sealBody(squash: CGFloat = 1) -> some View {
        ZStack {
            // 물방울형 몸통
            SealBody()
                .fill(HM.harangBody)
                .overlay(SealBody().stroke(line, lineWidth: 5))
            // 배
            Ellipse()
                .fill(HM.harangBelly)
                .frame(width: 118, height: 96)
                .offset(y: 62)
            // 꼬리 지느러미
            Ellipse()
                .fill(HM.harangFin)
                .overlay(Ellipse().stroke(line, lineWidth: 4))
                .frame(width: 44, height: 26)
                .rotationEffect(.degrees(30))
                .offset(x: 88, y: 116)
        }
        .scaleEffect(x: squash == 1 ? 1 : 1.02, y: squash == 1 ? 1 : 0.965)
    }

    private var scarf: some View {
        ZStack {
            Capsule()
                .fill(scarfColor)
                .overlay(Capsule().stroke(line, lineWidth: 4))
                .frame(width: 148, height: 30)
                .offset(y: 58)
            RoundedRectangle(cornerRadius: 8)
                .fill(scarfColor.opacity(0.86))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(line, lineWidth: 4))
                .frame(width: 30, height: 52)
                .rotationEffect(.degrees(10))
                .offset(x: 34, y: 92)
        }
    }

    private func eyes(open: Bool) -> some View {
        ZStack {
            if open {
                Circle().fill(HM.harangEye).frame(width: 32)
                    .overlay(Circle().fill(.white).frame(width: 11).offset(x: -4, y: -5))
                    .offset(x: -40, y: -30)
                Circle().fill(HM.harangEye).frame(width: 32)
                    .overlay(Circle().fill(.white).frame(width: 11).offset(x: -4, y: -5))
                    .offset(x: 40, y: -30)
            } else {
                BlinkEye().stroke(line, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 30, height: 12).offset(x: -40, y: -28)
                BlinkEye().stroke(line, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .frame(width: 30, height: 12).offset(x: 40, y: -28)
            }
        }
    }

    private var happyEyes: some View {
        ZStack {
            HappyEye().stroke(line, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .frame(width: 30, height: 14).offset(x: -40, y: -32)
            HappyEye().stroke(line, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .frame(width: 30, height: 14).offset(x: 40, y: -32)
        }
    }

    private var cheeks: some View {
        ZStack {
            Circle().fill(HM.harangCheek).frame(width: 22).offset(x: -64, y: -4)
            Circle().fill(HM.harangCheek).frame(width: 22).offset(x: 64, y: -4)
        }
    }

    private func muzzle(mouth: Mouth) -> some View {
        ZStack {
            Circle().fill(line).frame(width: 12).offset(y: -8)
            switch mouth {
            case .smile:
                SmileMouth().stroke(line, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .frame(width: 36, height: 14).offset(y: 10)
            case .open:
                Ellipse().fill(line).frame(width: 30, height: 26).offset(y: 14)
                Ellipse().fill(HM.harangTongue).frame(width: 18, height: 12).offset(y: 20)
            case .frown:
                SmileMouth().stroke(line, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                    .frame(width: 30, height: 12).rotationEffect(.degrees(180)).offset(y: 12)
            case .gritted:
                RoundedRectangle(cornerRadius: 4).fill(.white)
                    .overlay(RoundedRectangle(cornerRadius: 4).stroke(line, lineWidth: 4))
                    .overlay(Rectangle().fill(line).frame(width: 3))
                    .frame(width: 34, height: 14).offset(y: 12)
            }
            // 수염
            ForEach([-1.0, 1.0], id: \.self) { side in
                VStack(spacing: 8) {
                    Capsule().fill(HM.harangWhisker).frame(width: 30, height: 4)
                    Capsule().fill(HM.harangWhisker).frame(width: 30, height: 4)
                }
                .rotationEffect(.degrees(side * -6))
                .offset(x: side * 84, y: 4)
            }
        }
    }

    private enum Mouth { case smile, open, frown, gritted }

    private var greenShard: some View {
        ZStack {
            Circle().fill(HM.shardGreenLight.opacity(0.28)).frame(width: 96)
            ShardIcon(kind: .green, showHieut: true, size: 78)
        }
        .offset(y: 76)
    }

    private func fin(angle: Double, x: CGFloat, y: CGFloat) -> some View {
        Ellipse()
            .fill(HM.harangFin)
            .overlay(Ellipse().stroke(line, lineWidth: 4))
            .frame(width: 58, height: 30)
            .rotationEffect(.degrees(angle))
            .offset(x: x, y: y)
    }

    // MARK: 프레임들

    /// 기본 포즈: 조각 안기 + 깜빡임/스쿼시
    private var idleFrame: some View {
        ZStack {
            sealBody(squash: frame == 1 ? 0 : 1)
            scarf
            greenShard
            fin(angle: -26, x: -66, y: 62)
            fin(angle: 26, x: 66, y: 62)
            eyes(open: frame == 0)
            cheeks
            muzzle(mouth: .smile)
        }
        .offset(y: 10)
    }

    /// 물범 박수
    private var clapFrame: some View {
        ZStack {
            sealBody()
            scarf
            if frame == 0 {
                fin(angle: -102, x: -84, y: -30)
                fin(angle: 102, x: 84, y: -30)
            } else {
                fin(angle: -48, x: -52, y: 18)
                fin(angle: 48, x: 52, y: 18)
                // 임팩트 라인
                ForEach(0..<3, id: \.self) { i in
                    Capsule().fill(line.opacity(0.5))
                        .frame(width: 3, height: 14)
                        .rotationEffect(.degrees(Double(i - 1) * 28))
                        .offset(x: CGFloat(i - 1) * 16, y: 66)
                }
                // 떠다니는 조각·별
                ShardIcon(kind: .green, size: 22).offset(x: -110, y: -70)
                Image(systemName: "star.fill").font(.system(size: 15))
                    .foregroundStyle(HM.green).offset(x: 112, y: -58)
            }
            happyEyes
            cheeks
            muzzle(mouth: .open)
        }
        .scaleEffect(x: 1.08, y: 0.92)
        .rotationEffect(.degrees(4))
        .offset(y: 10)
    }

    /// 눈물 포즈
    private var sadFrame: some View {
        ZStack {
            sealBody()
            scarf
            fin(angle: -8, x: -70, y: 84)
            fin(angle: 8, x: 70, y: 84)
            // 처진 눈썹
            Capsule().fill(Color(hex: "#9AA3B2")).frame(width: 26, height: 5)
                .rotationEffect(.degrees(18)).offset(x: -40, y: -52)
            Capsule().fill(Color(hex: "#9AA3B2")).frame(width: 26, height: 5)
                .rotationEffect(.degrees(-18)).offset(x: 40, y: -52)
            eyes(open: true)
            cheeks
            muzzle(mouth: .frown)
            // 눈물
            TearDrop().fill(HM.harangTear)
                .frame(width: 16, height: 22)
                .offset(x: -52, y: frame == 1 ? 6 : -2)
        }
        .rotationEffect(.degrees(frame == 1 ? -3 : 0))
        .offset(y: 10)
    }

    /// 아쉬워 포즈 (컴패니언 오답: 부들부들 + 주먹)
    private var awFrame: some View {
        ZStack {
            sealBody()
            scarf
            // 주먹
            Circle().fill(HM.harangFin)
                .overlay(Circle().stroke(line, lineWidth: 4))
                .overlay(Capsule().fill(line).frame(width: 16, height: 3).offset(y: -3))
                .frame(width: 34).offset(x: -62, y: 44)
            Circle().fill(HM.harangFin)
                .overlay(Circle().stroke(line, lineWidth: 4))
                .overlay(Capsule().fill(line).frame(width: 16, height: 3).offset(y: -3))
                .frame(width: 34).offset(x: 62, y: 44)
            // 화난 눈썹 + >< 눈
            Capsule().fill(line).frame(width: 28, height: 5)
                .rotationEffect(.degrees(-20)).offset(x: -40, y: -52)
            Capsule().fill(line).frame(width: 28, height: 5)
                .rotationEffect(.degrees(20)).offset(x: 40, y: -52)
            CrossEye().stroke(line, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .frame(width: 24, height: 20).offset(x: -40, y: -28)
            CrossEye().stroke(line, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                .frame(width: 24, height: 20).offset(x: 40, y: -28)
            cheeks
            muzzle(mouth: .gritted)
            // 땀방울
            TearDrop().fill(HM.harangTear)
                .frame(width: 14, height: 19).offset(x: 84, y: -66)
        }
        .rotationEffect(.degrees(frame == 0 ? -5 : 5))
        .offset(y: 10)
    }

    /// 파티 포즈: 고깔모자 + 점프 + 콘페티
    private var partyFrame: some View {
        let jump: CGFloat = frame == 1 ? -26 : 0
        return ZStack {
            if frame >= 1 { confetti }
            ZStack {
                sealBody(squash: frame == 0 ? 0 : 1)
                scarf
                if frame == 1 {
                    fin(angle: -120, x: -80, y: -44)
                    fin(angle: 120, x: 80, y: -44)
                } else {
                    fin(angle: -60, x: -76, y: 20)
                    fin(angle: 60, x: 76, y: 20)
                }
                if frame == 0 {
                    eyes(open: true)
                } else {
                    happyEyes
                }
                cheeks
                muzzle(mouth: frame == 1 ? .open : .smile)
                // 고깔모자
                ZStack {
                    Triangle().fill(Color(hex: "#F97316"))
                        .overlay(Triangle().stroke(line, lineWidth: 4))
                        .frame(width: 56, height: 62)
                    Circle().fill(Color(hex: "#FDBA74")).frame(width: 18).offset(y: -34)
                }
                .rotationEffect(.degrees(12))
                .offset(x: 30, y: -104)
            }
            .offset(y: jump + 10)
        }
    }

    private var confetti: some View {
        ZStack {
            ForEach(0..<10, id: \.self) { i in
                let colors: [Color] = [Color(hex: "#F97316"), Color(hex: "#FBBF24"),
                                       Color(hex: "#60A5FA"), Color(hex: "#F472B6"),
                                       HM.green, HM.shardGreenLight]
                let angle = Double(i) * .pi / 5
                let radius: CGFloat = frame == 1 ? 120 : 140
                Group {
                    if i % 3 == 0 {
                        Rectangle().fill(colors[i % colors.count])
                            .frame(width: 12, height: 12)
                            .rotationEffect(.degrees(Double(i) * 37))
                    } else if i % 3 == 1 {
                        Circle().fill(colors[i % colors.count]).frame(width: 10)
                    } else {
                        DiamondShape().fill(colors[i % colors.count]).frame(width: 11, height: 14)
                    }
                }
                .offset(x: radius * cos(angle), y: radius * sin(angle) * 0.8 - 30 + (frame == 2 ? 18 : 0))
            }
        }
    }
}

// MARK: - 커스텀 도형

/// 물방울형 앉은 몸통
private struct SealBody: Shape {
    func path(in rect: CGRect) -> Path {
        // 320×320 기준: 위가 둥근 머리, 아래로 퍼지는 몸
        var p = Path()
        p.move(to: CGPoint(x: 160, y: 30))
        p.addCurve(to: CGPoint(x: 268, y: 180), control1: CGPoint(x: 245, y: 30), control2: CGPoint(x: 268, y: 110))
        p.addCurve(to: CGPoint(x: 160, y: 285), control1: CGPoint(x: 268, y: 250), control2: CGPoint(x: 235, y: 285))
        p.addCurve(to: CGPoint(x: 52, y: 180), control1: CGPoint(x: 85, y: 285), control2: CGPoint(x: 52, y: 250))
        p.addCurve(to: CGPoint(x: 160, y: 30), control1: CGPoint(x: 52, y: 110), control2: CGPoint(x: 75, y: 30))
        p.closeSubpath()
        // 좌표계를 rect에 맞춰 스케일
        let scaleX = rect.width / 320, scaleY = rect.height / 320
        return p.applying(CGAffineTransform(scaleX: scaleX, y: scaleY))
    }
}

/// 스마일 입 (아래로 볼록한 호)
private struct SmileMouth: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY),
                       control: CGPoint(x: rect.midX, y: rect.maxY + rect.height * 0.4))
        return p
    }
}

private struct BlinkEye: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY),
                       control: CGPoint(x: rect.midX, y: rect.maxY))
        return p
    }
}

private struct HappyEye: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.maxY),
                       control: CGPoint(x: rect.midX, y: rect.minY - rect.height * 0.4))
        return p
    }
}

private struct CrossEye: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.move(to: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        return p
    }
}

private struct TearDrop: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.height * 0.65),
                       control: CGPoint(x: rect.maxX, y: rect.height * 0.25))
        p.addArc(center: CGPoint(x: rect.midX, y: rect.height * 0.65),
                 radius: rect.width / 2,
                 startAngle: .degrees(0), endAngle: .degrees(180), clockwise: false)
        p.addQuadCurve(to: CGPoint(x: rect.midX, y: rect.minY),
                       control: CGPoint(x: rect.minX, y: rect.height * 0.25))
        p.closeSubpath()
        return p
    }
}

private struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.midX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}

// MARK: - 미니 컴패니언 (얼굴 blob)

struct MiniHarangFace: View {
    var size: CGFloat = 54

    var body: some View {
        ZStack {
            Ellipse()
                .fill(HM.harangBody)
                .overlay(Ellipse().stroke(HM.harangLine, lineWidth: 2.4))
            Circle().fill(HM.harangEye).frame(width: size * 0.13)
                .overlay(Circle().fill(.white).frame(width: size * 0.05).offset(x: -1, y: -1))
                .offset(x: -size * 0.16, y: -size * 0.06)
            Circle().fill(HM.harangEye).frame(width: size * 0.13)
                .overlay(Circle().fill(.white).frame(width: size * 0.05).offset(x: -1, y: -1))
                .offset(x: size * 0.16, y: -size * 0.06)
            Circle().fill(HM.harangCheek).frame(width: size * 0.11)
                .offset(x: -size * 0.3, y: size * 0.08)
            Circle().fill(HM.harangCheek).frame(width: size * 0.11)
                .offset(x: size * 0.3, y: size * 0.08)
            Circle().fill(HM.harangLine).frame(width: size * 0.06)
                .offset(y: size * 0.08)
        }
        .frame(width: size, height: size * 0.76)
    }
}

/// 아바타 포즈 키 → HarangPose 매핑 (프로필: idle/clap/party/sad 정지 프레임)
func avatarPose(_ key: String) -> HarangPose {
    switch key {
    case "clap": return .clap
    case "party": return .party
    case "sad": return .sad
    default: return .idle
    }
}

#Preview("포즈") {
    let scarf = Color(hex: "#10B981")
    return ScrollView {
        VStack(spacing: 8) {
            HStack {
                HarangFigure(pose: .idle, scarfColor: scarf, size: 150)
                HarangFigure(pose: .clap, scarfColor: scarf, size: 150)
            }
            HStack {
                HarangFigure(pose: .sad, scarfColor: scarf, size: 150)
                HarangFigure(pose: .aw, scarfColor: scarf, size: 150)
            }
            HarangFigure(pose: .party, scarfColor: Color(hex: "#8B5CF6"), size: 170)
            MiniHarangFace()
        }
    }
    .background(HM.brandMint)
}
