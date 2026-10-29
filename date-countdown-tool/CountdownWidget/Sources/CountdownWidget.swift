import AppKit
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        let contentView = CountdownView()
        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 360, height: 420),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        window.center()
        window.title = "桌面倒计时"
        window.titlebarAppearsTransparent = true
        window.isMovableByWindowBackground = true
        window.level = .floating
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        window.minSize = NSSize(width: 320, height: 380)
        window.contentView = NSHostingView(rootView: contentView)
        window.makeKeyAndOrderFront(nil)

        self.window = window
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

struct CountdownView: View {
    @State private var hours = 0
    @State private var minutes = 25
    @State private var seconds = 0
    @State private var remainingSeconds = 25 * 60
    @State private var targetDate: Date?
    @State private var isRunning = false
    @State private var hasFinished = false
    @State private var keepOnTop = true

    private let ticker = Timer.publish(every: 0.2, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.07, green: 0.09, blue: 0.11),
                    Color(red: 0.10, green: 0.13, blue: 0.15)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 22) {
                header
                timeDisplay
                controls
                presets
                inputs
                footer
            }
            .padding(.horizontal, 26)
            .padding(.vertical, 24)
        }
        .frame(minWidth: 320, minHeight: 380)
        .onReceive(ticker) { _ in
            tick()
        }
        .onChange(of: keepOnTop) { _, newValue in
            NSApp.windows.first?.level = newValue ? .floating : .normal
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("桌面倒计时")
                    .font(.system(size: 20, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
                Text(hasFinished ? "时间到" : (isRunning ? "正在计时" : "准备就绪"))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(hasFinished ? Color(red: 1, green: 0.74, blue: 0.38) : .white.opacity(0.58))
            }

            Spacer()

            Toggle("", isOn: $keepOnTop)
                .toggleStyle(.switch)
                .labelsHidden()
                .help("窗口置顶")
        }
    }

    private var timeDisplay: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .fill(Color.white.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .stroke(Color.white.opacity(0.12), lineWidth: 1)
                )

            VStack(spacing: 8) {
                Text(formattedTime)
                    .font(.system(size: 56, weight: .bold, design: .monospaced))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)

                ProgressView(value: progress)
                    .progressViewStyle(.linear)
                    .tint(hasFinished ? Color(red: 1, green: 0.74, blue: 0.38) : Color(red: 0.25, green: 0.86, blue: 0.68))
                    .frame(width: 230)
            }
            .padding(.vertical, 28)
        }
        .frame(height: 150)
    }

    private var controls: some View {
        HStack(spacing: 12) {
            Button(action: toggleTimer) {
                Label(isRunning ? "暂停" : "开始", systemImage: isRunning ? "pause.fill" : "play.fill")
                    .frame(maxWidth: .infinity)
            }
            .keyboardShortcut(.space, modifiers: [])
            .buttonStyle(PrimaryButtonStyle())

            Button(action: resetTimer) {
                Image(systemName: "arrow.counterclockwise")
                    .frame(width: 44, height: 38)
            }
            .buttonStyle(IconButtonStyle())
            .help("重置")
        }
    }

    private var presets: some View {
        HStack(spacing: 8) {
            presetButton("5", seconds: 5 * 60)
            presetButton("10", seconds: 10 * 60)
            presetButton("25", seconds: 25 * 60)
            presetButton("45", seconds: 45 * 60)
        }
    }

    private var inputs: some View {
        HStack(spacing: 10) {
            numberStepper(title: "时", value: $hours, range: 0...23)
            numberStepper(title: "分", value: $minutes, range: 0...59)
            numberStepper(title: "秒", value: $seconds, range: 0...59)
        }
        .disabled(isRunning)
        .opacity(isRunning ? 0.55 : 1)
    }

    private var footer: some View {
        HStack {
            Text("空格开始/暂停")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.45))
            Spacer()
            Text("拖动背景可移动")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.45))
        }
    }

    private var formattedTime: String {
        let h = remainingSeconds / 3600
        let m = (remainingSeconds % 3600) / 60
        let s = remainingSeconds % 60
        return h > 0 ? String(format: "%02d:%02d:%02d", h, m, s) : String(format: "%02d:%02d", m, s)
    }

    private var configuredSeconds: Int {
        max(0, hours * 3600 + minutes * 60 + seconds)
    }

    private var progress: Double {
        let total = max(1, configuredSeconds)
        return 1 - Double(remainingSeconds) / Double(total)
    }

    private func presetButton(_ label: String, seconds total: Int) -> some View {
        Button {
            setDuration(total)
        } label: {
            Text("\(label) 分")
                .font(.system(size: 13, weight: .semibold))
                .frame(maxWidth: .infinity, minHeight: 32)
        }
        .buttonStyle(SecondaryButtonStyle())
        .disabled(isRunning)
    }

    private func numberStepper(title: String, value: Binding<Int>, range: ClosedRange<Int>) -> some View {
        VStack(spacing: 6) {
            Stepper(value: value, in: range) {
                Text("\(value.wrappedValue)")
                    .font(.system(size: 18, weight: .semibold, design: .monospaced))
                    .foregroundStyle(.white)
                    .frame(width: 36, alignment: .leading)
            }
            .labelsHidden()
            .onChange(of: value.wrappedValue) { _, _ in
                syncRemainingFromInputs()
            }

            Text(title)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private func toggleTimer() {
        if isRunning {
            pauseTimer()
        } else {
            startTimer()
        }
    }

    private func startTimer() {
        if remainingSeconds <= 0 {
            syncRemainingFromInputs()
        }
        guard remainingSeconds > 0 else { return }

        hasFinished = false
        targetDate = Date().addingTimeInterval(TimeInterval(remainingSeconds))
        isRunning = true
    }

    private func pauseTimer() {
        tick()
        isRunning = false
        targetDate = nil
    }

    private func resetTimer() {
        isRunning = false
        hasFinished = false
        targetDate = nil
        syncRemainingFromInputs()
    }

    private func setDuration(_ total: Int) {
        hours = total / 3600
        minutes = (total % 3600) / 60
        seconds = total % 60
        remainingSeconds = total
        hasFinished = false
    }

    private func syncRemainingFromInputs() {
        if !isRunning {
            remainingSeconds = configuredSeconds
            hasFinished = false
        }
    }

    private func tick() {
        guard isRunning, let targetDate else { return }

        let nextRemaining = max(0, Int(ceil(targetDate.timeIntervalSinceNow)))
        if nextRemaining != remainingSeconds {
            remainingSeconds = nextRemaining
        }

        if nextRemaining == 0 {
            isRunning = false
            self.targetDate = nil
            hasFinished = true
            NSSound.beep()
            NSApp.requestUserAttention(.criticalRequest)
        }
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Color(red: 0.04, green: 0.07, blue: 0.07))
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(configuration.isPressed ? Color(red: 0.18, green: 0.72, blue: 0.58) : Color(red: 0.25, green: 0.86, blue: 0.68))
            )
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.white.opacity(configuration.isPressed ? 0.65 : 0.88))
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color.white.opacity(configuration.isPressed ? 0.10 : 0.07))
            )
    }
}

struct IconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(.white.opacity(configuration.isPressed ? 0.62 : 0.88))
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color.white.opacity(configuration.isPressed ? 0.10 : 0.07))
            )
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.run()
