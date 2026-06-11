#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$ROOT_DIR/DateCountdownNative/dist/日期倒计时.app"

if [[ ! -d "$APP_PATH" ]]; then
  osascript -e 'display alert "没找到日期倒计时.app" message "请确认这个脚本和 DateCountdownNative 文件夹还在同一个目录里。"'
  exit 1
fi

APP_URL="$(/usr/bin/python3 - "$APP_PATH" <<'PY'
import pathlib
import sys

path = pathlib.Path(sys.argv[1]).resolve()
print(path.as_uri() + "/")
PY
)"

if defaults read com.apple.dock persistent-apps 2>/dev/null | grep -q "local.codex.date-countdown-native"; then
  osascript -e 'display notification "日期倒计时已经在 Dock 里了" with title "不用重复添加"'
  exit 0
fi

defaults write com.apple.dock persistent-apps -array-add "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>$APP_URL</string><key>_CFURLStringType</key><integer>15</integer></dict><key>file-label</key><string>日期倒计时</string><key>bundle-identifier</key><string>local.codex.date-countdown-native</string></dict><key>tile-type</key><string>file-tile</string></dict>"

killall Dock
osascript -e 'display notification "已经固定到 Dock" with title "日期倒计时"'
echo "日期倒计时已添加到 Dock。"
echo "你可以关闭这个窗口。"
