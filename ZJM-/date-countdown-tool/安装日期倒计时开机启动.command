#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$ROOT_DIR/DateCountdownNative/dist/日期倒计时.app"
PLIST_PATH="$HOME/Library/LaunchAgents/local.codex.date-countdown-native.login.plist"
UID_VALUE="$(id -u)"

if [[ ! -d "$APP_PATH" ]]; then
  osascript -e 'display alert "没找到日期倒计时.app" message "请确认安装器和 DateCountdownNative 文件夹还在同一个目录里。"'
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

/usr/bin/python3 - "$PLIST_PATH" "$APP_PATH" <<'PY'
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
launchctl kickstart -k "gui/$UID_VALUE/local.codex.date-countdown-native.login"

osascript -e 'display notification "以后每次登录电脑都会自动打开" with title "日期倒计时已设置"'
echo "日期倒计时开机启动已安装。"
echo "你可以关闭这个窗口。"
