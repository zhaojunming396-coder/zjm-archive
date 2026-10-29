#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="桌面倒计时"
BUILD_DIR="$ROOT_DIR/build"
APP_DIR="$BUILD_DIR/$APP_NAME.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
MODULE_CACHE_DIR="$BUILD_DIR/module-cache"

rm -rf "$BUILD_DIR"
mkdir -p "$MACOS_DIR" "$MODULE_CACHE_DIR"

swiftc \
  "$ROOT_DIR/Sources/CountdownWidget.swift" \
  -o "$MACOS_DIR/CountdownWidget" \
  -module-cache-path "$MODULE_CACHE_DIR" \
  -Xcc -fmodules-cache-path="$MODULE_CACHE_DIR" \
  -framework SwiftUI \
  -framework AppKit

cp "$ROOT_DIR/Info.plist" "$CONTENTS_DIR/Info.plist"
chmod +x "$MACOS_DIR/CountdownWidget"

echo "$APP_DIR"
