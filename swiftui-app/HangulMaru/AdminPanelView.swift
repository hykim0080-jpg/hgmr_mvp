import SwiftUI

/// 관리자 검수 패널 (간이 버전) — 신고 단어 목록 열람
struct AdminPanelView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            List {
                let targets = store.reports.keys.sorted()
                if targets.isEmpty {
                    Text("접수된 신고가 없어요.")
                        .font(.system(size: 14))
                        .foregroundStyle(HM.textMuted)
                } else {
                    ForEach(targets, id: \.self) { target in
                        Section {
                            if let word = store.wordsByTarget[target] {
                                VStack(alignment: .leading, spacing: 6) {
                                    HStack(spacing: 8) {
                                        Text(word.target)
                                            .font(.system(size: 16, weight: .heavy))
                                        Text("Lv.\(word.level)")
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundStyle(.white)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(HM.blue)
                                            .clipShape(RoundedRectangle(cornerRadius: 5))
                                    }
                                    Text(word.meaning)
                                        .font(.system(size: 13))
                                        .foregroundStyle(HM.textSub)
                                    Text(word.sentence)
                                        .font(.system(size: 12))
                                        .foregroundStyle(HM.textMuted)
                                }
                            }
                            ForEach(store.reports[target] ?? []) { report in
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(report.reason)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(HM.red)
                                    if !report.detail.isEmpty {
                                        Text(report.detail)
                                            .font(.system(size: 12))
                                            .foregroundStyle(HM.textSub)
                                    }
                                    Text(report.d)
                                        .font(.system(size: 10))
                                        .foregroundStyle(HM.textMuted)
                                }
                            }
                            Button("처리 완료") {
                                store.reports.removeValue(forKey: target)
                                store.saveGlobal()
                            }
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(HM.greenDeep)
                        }
                    }
                }
            }
            .navigationTitle("🔧 검토 단어 제어판")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("닫기") { store.showAdminPanel = false }
                }
            }
        }
    }
}
