#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_APP="$ROOT_DIR/DateCountdownNative/dist/日期倒计时.app"
TARGET_DIR="$HOME/Applications"
TARGET_APP="$TARGET_DIR/日期倒计时.app"
DESKTOP_LAUNCHER="$HOME/Desktop/打开日期倒计时.command"

if [[ ! -d "$SOURCE_APP" ]]; then
  osascript -e 'display alert "没找到日期倒计时.app" message "请确认这个安装器和 DateCountdownNative 文件夹还在同一个目录里。"'
  exit 1
fi

mkdir -p "$TARGET_DIR"
ditto "$SOURCE_APP" "$TARGET_APP"

cat > "$DESKTOP_LAUNCHER" <<EOF
#!/bin/zsh
open -na "$TARGET_APP"
EOF

chmod +x "$DESKTOP_LAUNCHER"
open -na "$TARGET_APP"

osascript -e 'display notification "已放到应用程序，并在桌面创建入口" with title "日期倒计时安装好了"'
echo "安装完成：$TARGET_APP"
echo "桌面入口：$DESKTOP_LAUNCHER"
echo "以后你可以："
echo "1. 双击桌面的“打开日期倒计时.command”"
echo "2. 按 Command + Space 搜索“日期倒计时”"
echo "3. 在 Finder 的个人应用程序文件夹里找到它"
