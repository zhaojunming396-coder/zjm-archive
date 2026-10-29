#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_APP="$ROOT_DIR/DateCountdownNative/dist/日期倒计时.app"
TARGET_DIR="$HOME/Applications"
TARGET_APP="$TARGET_DIR/日期倒计时.app"
LAUNCH_AGENT_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$LAUNCH_AGENT_DIR/local.codex.date-countdown-native.login.plist"
DESKTOP_LAUNCHER="$HOME/Desktop/打开日期倒计时.command"
UID_VALUE="$(id -u)"

if [[ ! -d "$SOURCE_APP" ]]; then
  osascript -e 'display alert "没找到日期倒计时.app" message "请确认这个安装器和 DateCountdownNative 文件夹还在同一个目录里。"'
  exit 1
fi

mkdir -p "$TARGET_DIR" "$LAUNCH_AGENT_DIR"
ditto "$SOURCE_APP" "$TARGET_APP"

cat > "$DESKTOP_LAUNCHER" <<EOF
#!/bin/zsh
open -na "$TARGET_APP"
EOF
chmod +x "$DESKTOP_LAUNCHER"

/usr/bin/python3 - "$PLIST_PATH" "$TARGET_APP" <<'PY'
import plistlib
import sys

plist_path, app_path = sys.argv[1], sys.argv[2]
data = {
    "Label": "local.codex.date-countdown-native.login",
    "ProgramArguments": ["/usr/bin/open", "-na", app_path],
    "RunAtLoad": True,
    "StandardOutPath": "/tmp/date-countdown-login.out.log",
    "StandardErrorPath": "/tmp/date-countdown-login.err.log",
}

with open(plist_path, "wb") as file:
    plistlib.dump(data, file)
PY

launchctl bootout "gui/$UID_VALUE" "$PLIST_PATH" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID_VALUE" "$PLIST_PATH"
launchctl enable "gui/$UID_VALUE/local.codex.date-countdown-native.login"
launchctl kickstart -k "gui/$UID_VALUE/local.codex.date-countdown-native.login"

osascript -e 'display notification "以后每次登录电脑都会自动弹出" with title "日期倒计时设置好了"'
echo "完成。"
echo "应用位置：$TARGET_APP"
echo "桌面入口：$DESKTOP_LAUNCHER"
echo "开机登录自动弹出：已设置"
echo "你可以关闭这个窗口。"
