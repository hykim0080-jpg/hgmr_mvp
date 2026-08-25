import SwiftUI

/// 이메일 로그인/회원가입 화면
struct EmailLoginView: View {
    @Environment(AppStore.self) private var store

    @State private var email = ""
    @State private var password = ""
    @State private var passwordConfirm = ""
    @FocusState private var focused: Field?
    enum Field { case email, password, confirm }

    private var isSignup: Bool { store.authMode == .signup }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // 상단 바
                HStack(spacing: 8) {
                    Button {
                        store.screen = .welcome
                    } label: {
                        Image(systemName: "chevron.left")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(HM.inkText)
                            .frame(width: 36, height: 36)
                    }
                    ShardIcon(kind: .green, showHieut: true, size: 26)
                    Text("한글마루")
                        .font(.system(size: 17, weight: .black))
                        .foregroundStyle(HM.textPrimary)
                }

                // 타이틀 + 하랑이
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(isSignup ? "처음 오셨네요!\n계정을 만들어요" : "다시 만나서\n반가워요")
                            .font(.system(size: 26, weight: .black))
                            .foregroundStyle(HM.textPrimary)
                            .lineSpacing(6)
                        Text(isSignup ? "하랑이와 함께 시작해요" : "하랑이가 기다리고 있었어요")
                            .font(.system(size: 14))
                            .foregroundStyle(HM.textSecondary)
                    }
                    Spacer()
                    HarangFigure(pose: .idle, scarfColor: Color(hex: "#10B981"), size: 88, animated: false)
                }
                .padding(.top, 36)

                // 입력 필드
                VStack(spacing: 12) {
                    inputField("이메일", text: $email, field: .email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    secureField("비밀번호 (6자 이상)", text: $password, field: .password)
                    if isSignup {
                        secureField("비밀번호 확인", text: $passwordConfirm, field: .confirm)
                    }
                }
                .padding(.top, 32)

                // 제출
                Button {
                    store.submitEmailAuth(email: email, password: password, passwordConfirm: passwordConfirm)
                } label: {
                    Text(isSignup ? "회원가입" : "로그인")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(Color(hex: "#10B981"))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                .padding(.top, 16)

                if !isSignup {
                    Button {
                        store.sendPasswordReset(email: email)
                    } label: {
                        Text("비밀번호를 잊었나요?")
                            .font(.system(size: 13))
                            .foregroundStyle(HM.textSecondary)
                            .underline()
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 14)
                }

                // 모드 전환
                HStack(spacing: 6) {
                    Text(isSignup ? "이미 계정이 있나요?" : "아직 계정이 없나요?")
                        .foregroundStyle(HM.textSecondary)
                    Button(isSignup ? "로그인" : "회원가입") {
                        store.authMode = isSignup ? .login : .signup
                    }
                    .foregroundStyle(Color(hex: "#10B981"))
                    .fontWeight(.bold)
                }
                .font(.system(size: 14))
                .frame(maxWidth: .infinity)
                .padding(.top, 18)

                // 구분선
                HStack(spacing: 12) {
                    Rectangle().fill(HM.border).frame(height: 1)
                    Text("또는").font(.system(size: 12)).foregroundStyle(HM.textMuted)
                    Rectangle().fill(HM.border).frame(height: 1)
                }
                .padding(.vertical, 20)

                // Google
                Button {
                    store.signInGoogle()
                } label: {
                    HStack(spacing: 10) {
                        Text("G")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Color(hex: "#4285F4"))
                            .frame(width: 22, height: 22)
                            .background(HM.bgMuted)
                            .clipShape(Circle())
                        Text("Google로 계속하기")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(HM.textPrimary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(HM.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(HM.border, lineWidth: 1.5))
                }

                Button {
                    store.signInAnonymously()
                } label: {
                    Text("로그인 없이 둘러보기 →")
                        .font(.system(size: 14))
                        .foregroundStyle(HM.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 24)
            }
            .padding(.horizontal, 28)
            .padding(.top, 16)
            .padding(.bottom, 28)
        }
        .background(HM.surface.ignoresSafeArea())
        .scrollDismissesKeyboard(.interactively)
    }

    private func inputField(_ placeholder: String, text: Binding<String>, field: Field) -> some View {
        TextField(placeholder, text: text)
            .font(.system(size: 15))
            .padding(.horizontal, 16)
            .frame(height: 52)
            .background(HM.bgSubtle)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(focused == field ? Color(hex: "#10B981") : HM.border, lineWidth: 1.5)
            )
            .focused($focused, equals: field)
    }

    private func secureField(_ placeholder: String, text: Binding<String>, field: Field) -> some View {
        SecureField(placeholder, text: text)
            .font(.system(size: 15))
            .padding(.horizontal, 16)
            .frame(height: 52)
            .background(HM.bgSubtle)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(focused == field ? Color(hex: "#10B981") : HM.border, lineWidth: 1.5)
            )
            .focused($focused, equals: field)
    }
}

#Preview {
    EmailLoginView().environment(AppStore())
}
