import Foundation

struct Word: Codable, Identifiable, Hashable {
    let target: String
    let accepts: [String]
    let meaning: String
    let sentence: String
    let level: Int
    let tags: [String]

    var id: String { target }

    /// "경제_경영" → "경제·경영"
    var tagLabel: String {
        (tags.first ?? "전체").replacingOccurrences(of: "_", with: "·")
    }
}

enum Screen {
    case welcome, home, quiz, result
}

enum QuizPhase {
    case answering
    case correct
    case wrong
}
