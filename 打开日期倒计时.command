#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PATH="$ROOT_DIR/DateCountdownNative/dist/日期倒计时.app"

if [[ ! -d "$APP_PATH" ]]; then
  osascript -e 'display alert "没找到日期倒计时.app" message "请确认这个启动器和 DateCountdownNative 文件夹还在同一个目录里。"'
  exit 1
fi

open -na "$APP_PATH"
