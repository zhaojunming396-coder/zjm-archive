import AppKit
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 440, height: 380),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        window.center()
        window.title = "日期倒计时"
        window.titlebarAppearsTransparent = true
        window.isMovableByWindowBackground = true
        window.level = .floating
        window.minSize = NSSize(width: 360, height: 320)
        window.contentView = NSHostingView(rootView: DateCountdownView())
        window.makeKeyAndOrderFront(nil)

        self.window = window
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

struct DateCountdownView: View {
    @AppStorage("countdownTitle") private var title = "距离目标日"
    @AppStorage("countdownNote") private var note = "愿你稳稳抵达"
    @AppStorage("targetDateText") private var targetDateText = "2026-12-31"
    @AppStorage("targetTimeText") private var targetTimeText = "00:00"
    @AppStorage("keepOnTop") private var keepOnTop = true
    @AppStorage("wallpaperPath") private var wallpaperPath = ""

    @State private var now = Date()
    @State private var isEditing = false

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    private let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter
    }()

    var body: some View {
        ZStack {
            background

            VStack(spacing: 18) {
                header

                if isEditing {
                    editor
                } else {
                    display
                }
            }
            .padding(24)
        }
        .frame(minWidth: 360, minHeight: 320)
        .onReceive(timer) { value in
            now = value
        }
        .onAppear {
            NSApp.windows.first?.level = keepOnTop ? .floating : .normal
        }
        .onChange(of: keepOnTop) { _, value in
            NSApp.windows.first?.level = value ? .floating : .normal
        }
    }

    private var background: some View {
        ZStack {
            Color(red: 0.94, green: 0.90, blue: 0.82)

            if let image = wallpaperImage {
                Image(nsImage: image)
                    .resizable()
                    .scaledToFill()
                    .overlay(Color.black.opacity(0.18))
                    .clipped()
            }

            LinearGradient(
                colors: [
                    Color(red: 0.98, green: 0.94, blue: 0.86).opacity(wallpaperImage == nil ? 0 : 0.56),
                    Color(red: 0.98, green: 0.94, blue: 0.86).opacity(wallpaperImage == nil ? 0 : 0.34)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
        .ignoresSafeArea()
    }

    private var header: some View {
        HStack(spacing: 10) {
            Text(title.isEmpty ? "日期倒计时" : title)
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(Color(red: 0.12, green: 0.11, blue: 0.09))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)

            Button(isEditing ? "完成" : "编辑") {
                isEditing.toggle()
            }
            .buttonStyle(PillButtonStyle(dark: true))

            Button(keepOnTop ? "已置顶" : "置顶") {
                keepOnTop.toggle()
            }
            .buttonStyle(PillButtonStyle(dark: true))
        }
    }

    private var display: some View {
        VStack(spacing: 14) {
            Spacer(minLength: 4)

            HStack(alignment: .lastTextBaseline, spacing: 8) {
                Text(countdown.daysText)
                    .font(.system(size: 96, weight: .black, design: .rounded))
                    .foregroundStyle(Color(red: 0.07, green: 0.07, blue: 0.06))
                    .lineLimit(1)
                    .minimumScaleFactor(0.55)

                Text("天")
                    .font(.system(size: 30, weight: .bold, design: .rounded))
                    .foregroundStyle(Color(red: 0.07, green: 0.07, blue: 0.06))
                    .padding(.bottom, 12)
            }

            Text(countdown.detailText)
                .font(.system(size: 18, weight: .semibold, design: .monospaced))
                .foregroundStyle(Color(red: 0.32, green: 0.29, blue: 0.24))

            Text(note.isEmpty ? "点编辑可以改标题、文案和日期" : note)
                .font(.system(size: 15, weight: .medium, design: .rounded))
                .foregroundStyle(Color(red: 0.46, green: 0.40, blue: 0.32))
                .multilineTextAlignment(.center)
                .lineLimit(3)
                .frame(maxWidth: 330)
                .padding(.top, 8)

            Spacer(minLength: 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var editor: some View {
        VStack(spacing: 12) {
            field("标题", text: $title, placeholder: "例如：距离考研")
            field("文案", text: $note, placeholder: "例如：每天靠近一点点")
            field("日期", text: $targetDateText, placeholder: "YYYY-MM-DD")
            field("时间", text: $targetTimeText, placeholder: "HH:MM")

            HStack(spacing: 10) {
                Button("选择壁纸") {
                    chooseWallpaper()
                }
                .buttonStyle(PillButtonStyle(dark: false))

                if wallpaperImage != nil {
                    Button("清除壁纸") {
                        wallpaperPath = ""
                    }
                    .buttonStyle(PillButtonStyle(dark: false))
                }

                Spacer(minLength: 0)

                Button("今天") {
                    let date = Date()
                    targetDateText = formatDate(date)
                    targetTimeText = formatTime(date)
                }
                .buttonStyle(PillButtonStyle(dark: false))

                Button("年底") {
                    let year = Calendar.current.component(.year, from: Date())
                    targetDateText = "\(year)-12-31"
                    targetTimeText = "00:00"
                }
                .buttonStyle(PillButtonStyle(dark: false))

                Button("完成") {
                    isEditing = false
                }
                .buttonStyle(PillButtonStyle(dark: true))
            }
            .padding(.top, 4)

            if targetDate == nil {
                Text("日期格式请用 2026-12-31，时间格式请用 18:30")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color(red: 0.72, green: 0.18, blue: 0.10))
            }
        }
        .padding(16)
        .background(Color(red: 0.98, green: 0.95, blue: 0.88).opacity(0.90), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private func field(_ label: String, text: Binding<String>, placeholder: String) -> some View {
        HStack(spacing: 10) {
            Text(label)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(Color(red: 0.42, green: 0.36, blue: 0.28))
                .frame(width: 42, alignment: .leading)

            TextField(placeholder, text: text)
                .textFieldStyle(.plain)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(Color(red: 0.10, green: 0.09, blue: 0.08))
                .padding(.horizontal, 10)
                .padding(.vertical, 9)
                .background(.white.opacity(0.72), in: RoundedRectangle(cornerRadius: 7, style: .continuous))
        }
    }

    private var targetDate: Date? {
        dateFormatter.date(from: "\(targetDateText.trimmingCharacters(in: .whitespaces)) \(targetTimeText.trimmingCharacters(in: .whitespaces))")
    }

    private var wallpaperImage: NSImage? {
        guard !wallpaperPath.isEmpty else { return nil }
        return NSImage(contentsOfFile: wallpaperPath)
    }

    private var countdown: (daysText: String, detailText: String) {
        guard let targetDate else {
            return ("--", "日期格式不对")
        }

        let diff = Int(targetDate.timeIntervalSince(now))
        let absDiff = abs(diff)
        let days = absDiff / 86_400
        let hours = (absDiff % 86_400) / 3_600
        let minutes = (absDiff % 3_600) / 60
        let seconds = absDiff % 60
        let prefix = diff < 0 ? "已经过去" : "还剩"
        return (String(days), "\(prefix) \(String(format: "%02d:%02d:%02d", hours, minutes, seconds))")
    }

    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }

    private func chooseWallpaper() {
        let panel = NSOpenPanel()
        panel.title = "选择倒计时壁纸"
        panel.allowedContentTypes = [.image]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true

        if panel.runModal() == .OK, let url = panel.url {
            wallpaperPath = url.path
        }
    }
}

struct PillButtonStyle: ButtonStyle {
    let dark: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .bold, design: .rounded))
            .foregroundStyle(dark ? Color(red: 0.98, green: 0.95, blue: 0.88) : Color(red: 0.12, green: 0.10, blue: 0.08))
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(dark ? Color(red: 0.13, green: 0.12, blue: 0.10) : Color(red: 0.88, green: 0.82, blue: 0.70))
                    .opacity(configuration.isPressed ? 0.75 : 1)
            )
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
